/**
 * M-Pesa STK Push initiation endpoint.
 *
 * Behavior:
 *  - LIVE MODE: Activated automatically when all four secrets are present:
 *      MPESA_CONSUMER_KEY, MPESA_CONSUMER_SECRET, MPESA_SHORTCODE, MPESA_PASSKEY
 *    The endpoint requests an OAuth token from Daraja, builds the STK Push
 *    payload, sends it to /mpesa/stkpush/v1/processrequest, stores the
 *    CheckoutRequestID on the payment_attempt row, and returns immediately.
 *    Daraja then POSTs the result to /api/mpesa/callback (route below).
 *
 *  - TEST MODE: When any secret is missing, the request is accepted, marked
 *    test_mode=true, and a background timer marks the attempt 'success' after
 *    ~5s + applies the wallet credit / invoice payment so the full UI flow
 *    can be exercised without real Daraja keys.
 *
 * Security:
 *  - Requires a valid Supabase auth bearer token (verified via SUPABASE_URL).
 *  - Uses the service-role client to update payment_attempts and call
 *    credit_wallet_topup / pay_invoice_with_wallet RPCs after success.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

interface StkBody {
  invoice_id?: string | null;
  amount: number;
  phone: string;
  purpose: "invoice" | "wallet_topup";
}

function getEnv(name: string): string | undefined {
  // process.env in Worker runtime
  return (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.[name];
}

function isLiveMode(): boolean {
  return Boolean(
    getEnv("MPESA_CONSUMER_KEY") &&
    getEnv("MPESA_CONSUMER_SECRET") &&
    getEnv("MPESA_SHORTCODE") &&
    getEnv("MPESA_PASSKEY"),
  );
}

function getAdminClient() {
  const url = getEnv("SUPABASE_URL");
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !serviceKey) throw new Error("Missing Supabase server env vars");
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function normalizePhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) return "254" + digits;
  return null;
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

async function getDarajaToken(): Promise<string> {
  const key = getEnv("MPESA_CONSUMER_KEY")!;
  const secret = getEnv("MPESA_CONSUMER_SECRET")!;
  const env = getEnv("MPESA_ENV") ?? "sandbox";
  const base = env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const auth = btoa(`${key}:${secret}`);
  const res = await fetch(`${base}/oauth/v1/generate/token?grant_type=client_credentials`, {
    headers: { Authorization: `Basic ${auth}` },
  });
  if (!res.ok) throw new Error(`Daraja OAuth failed: ${res.status}`);
  const data = (await res.json()) as { access_token: string };
  return data.access_token;
}

async function sendStkPush(opts: { phone: string; amount: number; reference: string; description: string }) {
  const shortcode = getEnv("MPESA_SHORTCODE")!;
  const passkey = getEnv("MPESA_PASSKEY")!;
  const env = getEnv("MPESA_ENV") ?? "sandbox";
  const base = env === "production" ? "https://api.safaricom.co.ke" : "https://sandbox.safaricom.co.ke";
  const callbackUrl = getEnv("MPESA_CALLBACK_URL") ?? `${getEnv("SITE_URL") ?? ""}/api/mpesa/callback`;

  const now = new Date();
  const ts =
    now.getFullYear().toString() +
    String(now.getMonth() + 1).padStart(2, "0") +
    String(now.getDate()).padStart(2, "0") +
    String(now.getHours()).padStart(2, "0") +
    String(now.getMinutes()).padStart(2, "0") +
    String(now.getSeconds()).padStart(2, "0");
  const password = btoa(`${shortcode}${passkey}${ts}`);

  const token = await getDarajaToken();
  const res = await fetch(`${base}/mpesa/stkpush/v1/processrequest`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      BusinessShortCode: shortcode,
      Password: password,
      Timestamp: ts,
      TransactionType: "CustomerPayBillOnline",
      Amount: Math.round(opts.amount),
      PartyA: opts.phone,
      PartyB: shortcode,
      PhoneNumber: opts.phone,
      CallBackURL: callbackUrl,
      AccountReference: opts.reference.slice(0, 12),
      TransactionDesc: opts.description.slice(0, 13),
    }),
  });
  const data = (await res.json()) as { CheckoutRequestID?: string; ResponseCode?: string; errorMessage?: string };
  if (!res.ok || data.ResponseCode !== "0") {
    throw new Error(data.errorMessage ?? `STK push failed (${res.status})`);
  }
  return data.CheckoutRequestID!;
}

async function simulateTestModeSuccess(attemptId: string, userId: string, body: StkBody) {
  // Wait ~5 seconds then mark success and apply funds.
  setTimeout(() => {
    void (async () => {
      const admin = getAdminClient();
      try {
        await admin.from("payment_attempts").update({
          status: "success",
          provider_receipt: `TEST-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
          provider_response: { test_mode: true, simulated_at: new Date().toISOString() },
        }).eq("id", attemptId);

        if (body.purpose === "wallet_topup") {
          await admin.rpc("credit_wallet_topup", {
            _user_id: userId,
            _amount: body.amount,
            _description: `Wallet top-up (test mode) — KES ${body.amount}`,
          });
        } else if (body.invoice_id) {
          // Mark invoice paid + activate services. We replicate pay_invoice_with_wallet's logic
          // BUT credit a deposit first so the wallet pay RPC succeeds.
          await admin.rpc("credit_wallet_topup", {
            _user_id: userId,
            _amount: body.amount,
            _description: `M-Pesa test payment for invoice`,
          });
          // Now debit via wallet pay (atomic, also activates services).
          // We call directly with service role bypassing auth check inside RPC by impersonating.
          // The RPC checks auth.uid() — since we have no session, set the invoice paid manually:
          await admin.from("invoices").update({
            status: "paid",
            paid_at: new Date().toISOString(),
            payment_method: "mpesa",
          }).eq("id", body.invoice_id).eq("user_id", userId);
          // Activate services tied to this invoice.
          const { data: svcs } = await admin.from("services")
            .select("id, billing_cycle, metadata")
            .eq("user_id", userId)
            .eq("status", "pending");
          for (const s of svcs ?? []) {
            const meta = s.metadata as { invoice_id?: string } | null;
            if (meta?.invoice_id !== body.invoice_id) continue;
            const months =
              s.billing_cycle === "monthly" ? 1 :
              s.billing_cycle === "quarterly" ? 3 :
              s.billing_cycle === "semi_annually" ? 6 :
              s.billing_cycle === "annually" ? 12 : 0;
            const renew = months > 0 ? new Date(Date.now() + months * 30 * 24 * 3600 * 1000).toISOString() : null;
            await admin.from("services").update({
              status: "active",
              next_renewal_at: renew,
            }).eq("id", s.id);
          }
          // Record the payment as a wallet payment ledger entry & debit the deposit we just credited.
          await admin.from("wallet_balances").update({
            balance: 0,
          }).eq("user_id", userId);
          await admin.from("wallet_transactions").insert({
            user_id: userId,
            type: "payment",
            amount: body.amount,
            currency: "KES",
            description: `Payment for invoice via M-Pesa (test mode)`,
            invoice_id: body.invoice_id,
          });
        }
      } catch (e) {
        console.error("[mpesa test-mode simulation] failed", e);
      }
    })();
  }, 5000);
}

export const Route = createFileRoute("/api/mpesa/stk-push")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        // Verify Supabase auth
        const authHeader = request.headers.get("authorization") ?? "";
        if (!authHeader.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
        const token = authHeader.slice(7);

        const url = getEnv("SUPABASE_URL");
        const anon = getEnv("SUPABASE_PUBLISHABLE_KEY");
        if (!url || !anon) return jsonResponse({ error: "Server not configured" }, 500);
        const supa = createClient<Database>(url, anon, { auth: { persistSession: false } });
        const { data: userData, error: userErr } = await supa.auth.getUser(token);
        if (userErr || !userData.user) return jsonResponse({ error: "Invalid token" }, 401);
        const userId = userData.user.id;

        // Parse + validate body
        let body: StkBody;
        try {
          body = (await request.json()) as StkBody;
        } catch {
          return jsonResponse({ error: "Invalid JSON" }, 400);
        }
        const phone = normalizePhone(body.phone ?? "");
        if (!phone) return jsonResponse({ error: "Invalid phone number" }, 400);
        const amount = Number(body.amount);
        if (!Number.isFinite(amount) || amount < 1) return jsonResponse({ error: "Invalid amount" }, 400);
        if (body.purpose !== "invoice" && body.purpose !== "wallet_topup") {
          return jsonResponse({ error: "Invalid purpose" }, 400);
        }

        const admin = getAdminClient();
        const live = isLiveMode();

        // Create attempt row
        const { data: attempt, error: insErr } = await admin
          .from("payment_attempts")
          .insert({
            user_id: userId,
            invoice_id: body.invoice_id ?? null,
            purpose: body.purpose,
            method: "mpesa",
            amount,
            currency: "KES",
            phone,
            status: "pending",
          })
          .select("id")
          .single();
        if (insErr || !attempt) return jsonResponse({ error: insErr?.message ?? "Could not create attempt" }, 500);

        if (!live) {
          // Test mode — simulate success after 5s
          void simulateTestModeSuccess(attempt.id, userId, { ...body, amount, phone });
          return jsonResponse({
            ok: true,
            attempt_id: attempt.id,
            test_mode: true,
            message: "Test mode: payment will auto-complete in ~5 seconds.",
          });
        }

        // Live mode — call Daraja
        try {
          const checkoutId = await sendStkPush({
            phone,
            amount,
            reference: body.purpose === "wallet_topup" ? "WALLET" : (body.invoice_id ?? "INVOICE").slice(0, 12),
            description: body.purpose === "wallet_topup" ? "Wallet top-up" : "Invoice payment",
          });
          await admin.from("payment_attempts")
            .update({ provider_request_id: checkoutId })
            .eq("id", attempt.id);
          return jsonResponse({
            ok: true,
            attempt_id: attempt.id,
            test_mode: false,
            message: "STK push sent. Check your phone to authorize the payment.",
          });
        } catch (e) {
          const msg = e instanceof Error ? e.message : "STK push failed";
          await admin.from("payment_attempts")
            .update({ status: "failed", error_message: msg })
            .eq("id", attempt.id);
          return jsonResponse({ error: msg }, 502);
        }
      },
    },
  },
});
