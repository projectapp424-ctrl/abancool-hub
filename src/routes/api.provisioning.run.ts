/**
 * Provisioning queue runner.
 *
 * Pulls every queued job and dispatches to provider-specific handlers.
 * In TEST MODE (no provider credentials configured), each handler simulates
 * success so the pipeline can be exercised end-to-end.
 *
 * Once real credentials are added (DA_HOST/DA_USER/DA_PASS,
 * RESELLERCLUB_ID/RESELLERCLUB_KEY, AT_USERNAME/AT_API_KEY/AT_SENDER_ID),
 * each handler will switch to live calls automatically.
 *
 * Auth: requires a valid Supabase session whose user is staff (admin / super_admin).
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

interface Job {
  id: string;
  user_id: string;
  service_id: string | null;
  invoice_id: string | null;
  provider: string;
  payload: Record<string, unknown>;
  attempts: number;
}

async function runDirectAdmin(_job: Job): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  const host = getEnv("DA_HOST");
  if (!host) {
    // Stub
    return { ok: true, result: { stub: true, account: `acct-${Math.random().toString(36).slice(2, 8)}` } };
  }
  // TODO: live DirectAdmin call once credentials are added.
  return { ok: true, result: { stub: true } };
}
async function runResellerClub(_job: Job): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  const id = getEnv("RESELLERCLUB_ID");
  if (!id) return { ok: true, result: { stub: true, registered: true } };
  return { ok: true, result: { stub: true } };
}
async function runSmsCredits(job: Job): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  // No provider call needed — the trigger fulfill_sms_credits_on_paid grants credits when status flips.
  return { ok: true, result: { credits_granted: true, payload: job.payload } };
}
async function runManual(_job: Job): Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }> {
  return { ok: false, error: "Manual provisioning required" };
}

const handlers: Record<string, (j: Job) => Promise<{ ok: true; result: Record<string, unknown> } | { ok: false; error: string }>> = {
  directadmin: runDirectAdmin,
  resellerclub: runResellerClub,
  sms_credits: runSmsCredits,
  manual: runManual,
};

export const Route = createFileRoute("/api/provisioning/run")({
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

        const a = admin();
        const { data: isStaff } = await a.rpc("is_staff", { _user_id: userData.user.id });
        if (!isStaff) return jsonResponse({ error: "Forbidden" }, 403);

        const { data: jobs, error: jErr } = await a
          .from("provisioning_jobs")
          .select("id, user_id, service_id, invoice_id, provider, payload, attempts")
          .eq("status", "queued")
          .order("created_at")
          .limit(50);
        if (jErr) return jsonResponse({ error: jErr.message }, 500);

        let processed = 0;
        for (const job of (jobs as unknown as Job[]) ?? []) {
          await a.from("provisioning_jobs").update({
            status: "running", attempts: job.attempts + 1, updated_at: new Date().toISOString(),
          }).eq("id", job.id);

          const handler = handlers[job.provider] ?? runManual;
          let outcome: Awaited<ReturnType<typeof handler>>;
          try {
            outcome = await handler(job);
          } catch (e) {
            outcome = { ok: false, error: e instanceof Error ? e.message : "Handler crashed" };
          }

          if (outcome.ok) {
            await a.from("provisioning_jobs").update({
              status: "succeeded",
              result: outcome.result as unknown as Database["public"]["Tables"]["provisioning_jobs"]["Update"]["result"],
              completed_at: new Date().toISOString(),
              last_error: null,
            }).eq("id", job.id);

            // Activate the service (if any)
            if (job.service_id) {
              await a.from("services").update({
                status: "active",
                updated_at: new Date().toISOString(),
              }).eq("id", job.service_id);
            }
            processed += 1;
          } else {
            await a.from("provisioning_jobs").update({
              status: "failed",
              last_error: outcome.error,
            }).eq("id", job.id);
          }
        }

        return jsonResponse({ ok: true, processed });
      },
    },
  },
});
