/**
 * Returns the current status of a payment_attempt to the polling client.
 */
import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

function getEnv(name: string): string | undefined {
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

function jsonResponse(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const Route = createFileRoute("/api/mpesa/status")({
  server: {
    handlers: {
      GET: async ({ request }) => {
        const url = new URL(request.url);
        const attemptId = url.searchParams.get("attempt_id");
        if (!attemptId) return jsonResponse({ error: "Missing attempt_id" }, 400);

        const auth = request.headers.get("authorization") ?? "";
        if (!auth.startsWith("Bearer ")) return jsonResponse({ error: "Unauthorized" }, 401);
        const token = auth.slice(7);

        const supabaseUrl = getEnv("SUPABASE_URL");
        const anon = getEnv("SUPABASE_PUBLISHABLE_KEY");
        if (!supabaseUrl || !anon) return jsonResponse({ error: "Server not configured" }, 500);

        const supa = createClient<Database>(supabaseUrl, anon, {
          global: { headers: { Authorization: `Bearer ${token}` } },
          auth: { persistSession: false },
        });

        const { data, error } = await supa
          .from("payment_attempts")
          .select("status, invoice_id, amount, error_message")
          .eq("id", attemptId)
          .maybeSingle();
        if (error) return jsonResponse({ error: error.message }, 500);
        if (!data) return jsonResponse({ error: "Not found" }, 404);

        return jsonResponse({
          status: data.status,
          test_mode: !isLiveMode(),
          invoice_id: data.invoice_id,
          amount: Number(data.amount),
          message: data.error_message ?? undefined,
        });
      },
    },
  },
});
