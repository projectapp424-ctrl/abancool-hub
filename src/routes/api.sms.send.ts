/**
 * Bulk SMS sender.
 *
 * - Authenticated users only.
 * - Debits SMS credits (one credit per recipient, configurable via cost_credits).
 * - Inserts one row per recipient into sms_messages with provider='africastalking'.
 * - LIVE MODE: When AT_USERNAME and AT_API_KEY are configured, sends via the
 *   Africa's Talking REST API.
 * - STUB MODE: Otherwise, marks each message as 'sent' immediately so the UI
 *   flow works end-to-end.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getEnv(name: string): string | undefined {
  return (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.[name];
}

function admin() {
  const url = getEnv("SUPABASE_URL")!;
  const key = getEnv("SUPABASE_SERVICE_ROLE_KEY")!;
  return createClient<Database>(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function normalizeRecipient(r: string): string | null {
  const digits = r.replace(/\D/g, "");
  if (digits.startsWith("254") && digits.length === 12) return "+" + digits;
  if (digits.startsWith("0") && digits.length === 10) return "+254" + digits.slice(1);
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) return "+254" + digits;
  if (digits.length >= 10 && digits.length <= 15) return "+" + digits;
  return null;
}

interface Body { recipients: string[]; message: string; sender_id?: string }

export const Route = createFileRoute("/api/sms/send")({
  server: {
    handlers: {
      POST: async ({ request }) => {
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

        let body: Body;
        try { body = (await request.json()) as Body; }
        catch { return jsonResponse({ error: "Invalid JSON" }, 400); }
        const message = (body.message ?? "").trim();
        if (!message) return jsonResponse({ error: "Message is required" }, 400);
        if (message.length > 480) return jsonResponse({ error: "Message too long (max 480 chars)" }, 400);

        const valid = (body.recipients ?? []).map(normalizeRecipient).filter((r): r is string => !!r);
        if (valid.length === 0) return jsonResponse({ error: "At least one valid recipient is required" }, 400);
        if (valid.length > 1000) return jsonResponse({ error: "Maximum 1000 recipients per request" }, 400);

        // Cost: 1 credit per SMS segment (160 chars per part)
        const segments = Math.max(1, Math.ceil(message.length / 160));
        const costPerRecipient = segments;
        const totalCost = valid.length * costPerRecipient;

        const a = admin();
        const { data: bal } = await a.from("sms_credits").select("balance").eq("user_id", userId).maybeSingle();
        if ((bal?.balance ?? 0) < totalCost) {
          return jsonResponse({ error: `Insufficient SMS credits. Need ${totalCost}, have ${bal?.balance ?? 0}.` }, 402);
        }

        // Debit
        await a.from("sms_credits").upsert({
          user_id: userId, balance: (bal?.balance ?? 0) - totalCost, updated_at: new Date().toISOString(),
        });

        const live = Boolean(getEnv("AT_USERNAME") && getEnv("AT_API_KEY"));

        // Insert messages
        const rows = valid.map((r) => ({
          user_id: userId, recipient: r, message, cost_credits: costPerRecipient,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          status: (live ? "queued" : "sent") as any,
        }));
        const { data: inserted } = await a.from("sms_messages").insert(rows).select("id");

        if (live) {
          // TODO: Africa's Talking live call once credentials are confirmed.
          const username = getEnv("AT_USERNAME")!;
          const apiKey = getEnv("AT_API_KEY")!;
          const senderId = body.sender_id ?? getEnv("AT_SENDER_ID") ?? "AFRICASTKNG";
          try {
            const params = new URLSearchParams({
              username, to: valid.join(","), message, from: senderId,
            });
            const res = await fetch("https://api.africastalking.com/version1/messaging", {
              method: "POST",
              headers: {
                apiKey, Accept: "application/json",
                "Content-Type": "application/x-www-form-urlencoded",
              },
              body: params.toString(),
            });
            if (res.ok) {
              await a.from("sms_messages").update({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: "sent" as any, sent_at: new Date().toISOString(),
              }).in("id", (inserted ?? []).map((r) => r.id));
            } else {
              await a.from("sms_messages").update({
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                status: "failed" as any, error_message: `AT API ${res.status}`,
              }).in("id", (inserted ?? []).map((r) => r.id));
            }
          } catch (e) {
            await a.from("sms_messages").update({
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              status: "failed" as any, error_message: e instanceof Error ? e.message : "Send failed",
            }).in("id", (inserted ?? []).map((r) => r.id));
          }
        } else {
          await a.from("sms_messages").update({
            sent_at: new Date().toISOString(),
          }).in("id", (inserted ?? []).map((r) => r.id));
        }

        return jsonResponse({
          ok: true, sent: valid.length, credits_used: totalCost,
          remaining: (bal?.balance ?? 0) - totalCost, test_mode: !live,
        });
      },
    },
  },
});
