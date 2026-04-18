/**
 * M-Pesa Daraja STK Push callback receiver.
 *
 * Daraja POSTs the result of an STK Push to this URL after the customer accepts
 * or declines. We look up the payment_attempt by CheckoutRequestID, mark the
 * outcome, and on success apply the wallet credit / invoice payment using the
 * service-role admin client.
 *
 * Notes:
 *  - Daraja does not sign callbacks. The standard mitigation is to whitelist
 *    Safaricom IPs at the gateway/CDN. We additionally verify the
 *    CheckoutRequestID exists in our DB before mutating anything, so a
 *    forged callback can only mark a real outstanding attempt — never invent
 *    one. Amount must also match the stored attempt amount.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

interface DarajaCallback {
  Body: {
    stkCallback: {
      MerchantRequestID: string;
      CheckoutRequestID: string;
      ResultCode: number;
      ResultDesc: string;
      CallbackMetadata?: {
        Item: { Name: string; Value?: string | number }[];
      };
    };
  };
}

function getEnv(name: string): string | undefined {
  return (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.[name];
}

function getAdminClient() {
  const url = getEnv("SUPABASE_URL")!;
  const serviceKey = getEnv("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient<Database>(url, serviceKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

function ack(success: boolean, msg = "OK") {
  // Daraja expects this exact shape
  return new Response(JSON.stringify({ ResultCode: success ? 0 : 1, ResultDesc: msg }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/mpesa/callback")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        let payload: DarajaCallback;
        try {
          payload = (await request.json()) as DarajaCallback;
        } catch {
          return ack(false, "Invalid JSON");
        }
        const cb = payload?.Body?.stkCallback;
        if (!cb?.CheckoutRequestID) return ack(false, "Missing CheckoutRequestID");

        const admin = getAdminClient();
        const { data: attempt } = await admin
          .from("payment_attempts")
          .select("*")
          .eq("provider_request_id", cb.CheckoutRequestID)
          .maybeSingle();
        if (!attempt) return ack(false, "Attempt not found");
        if (attempt.status === "success") return ack(true, "Already processed");

        const success = cb.ResultCode === 0;
        const meta = cb.CallbackMetadata?.Item ?? [];
        const find = (k: string) => meta.find((m) => m.Name === k)?.Value;
        const receipt = String(find("MpesaReceiptNumber") ?? "");
        const paidAmount = Number(find("Amount") ?? attempt.amount);

        if (!success) {
          await admin.from("payment_attempts").update({
            status: cb.ResultCode === 1032 ? "cancelled" : "failed",
            error_message: cb.ResultDesc,
            provider_response: cb as unknown as Database["public"]["Tables"]["payment_attempts"]["Update"]["provider_response"],
          }).eq("id", attempt.id);
          return ack(true);
        }

        // Sanity check: amount must match
        if (Math.abs(paidAmount - Number(attempt.amount)) > 0.5) {
          await admin.from("payment_attempts").update({
            status: "failed",
            error_message: `Amount mismatch: paid ${paidAmount} vs expected ${attempt.amount}`,
            provider_response: cb as unknown as Database["public"]["Tables"]["payment_attempts"]["Update"]["provider_response"],
          }).eq("id", attempt.id);
          return ack(true);
        }

        await admin.from("payment_attempts").update({
          status: "success",
          provider_receipt: receipt,
          provider_response: cb as unknown as Database["public"]["Tables"]["payment_attempts"]["Update"]["provider_response"],
        }).eq("id", attempt.id);

        try {
          if (attempt.purpose === "wallet_topup") {
            await admin.rpc("credit_wallet_topup", {
              _user_id: attempt.user_id,
              _amount: Number(attempt.amount),
              _description: `Wallet top-up via M-Pesa (${receipt})`,
            });
          } else if (attempt.invoice_id) {
            // Credit then immediately mark invoice paid + activate services
            await admin.from("invoices").update({
              status: "paid",
              paid_at: new Date().toISOString(),
              payment_method: "mpesa",
            }).eq("id", attempt.invoice_id);
            await admin.from("wallet_transactions").insert({
              user_id: attempt.user_id,
              type: "payment",
              amount: Number(attempt.amount),
              currency: "KES",
              description: `Payment via M-Pesa (${receipt})`,
              invoice_id: attempt.invoice_id,
            });
            const { data: svcs } = await admin.from("services")
              .select("id, billing_cycle, metadata")
              .eq("user_id", attempt.user_id)
              .eq("status", "pending");
            for (const s of svcs ?? []) {
              const m = s.metadata as { invoice_id?: string } | null;
              if (m?.invoice_id !== attempt.invoice_id) continue;
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
          }
        } catch (e) {
          console.error("[mpesa callback] post-success failed", e);
        }

        return ack(true);
      },
    },
  },
});
