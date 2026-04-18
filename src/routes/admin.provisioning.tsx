import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Play, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PanelCard } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/provisioning")({
  component: AdminProvisioning,
});

interface Job {
  id: string;
  user_id: string;
  service_id: string | null;
  invoice_id: string | null;
  provider: string;
  status: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

function AdminProvisioning() {
  const { session } = useAuth();
  const [items, setItems] = useState<Job[]>([]);
  const [q, setQ] = useState("");
  const [running, setRunning] = useState(false);

  async function load() {
    const { data } = await supabase
      .from("provisioning_jobs")
      .select("id, user_id, service_id, invoice_id, provider, status, attempts, last_error, created_at, updated_at, completed_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setItems((data as Job[]) ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function runQueue() {
    if (!session) return;
    setRunning(true);
    try {
      const res = await fetch("/api/provisioning/run", {
        method: "POST",
        headers: { Authorization: `Bearer ${session.access_token}` },
      });
      const json = (await res.json()) as { processed?: number; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Run failed");
      toast.success(`Processed ${json.processed ?? 0} job(s)`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Run failed");
    } finally {
      setRunning(false);
    }
  }

  async function retry(id: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("provisioning_jobs").update({ status: "queued" as any, last_error: null }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Job re-queued");
    await load();
  }

  const filtered = items.filter((i) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [i.provider, i.status, i.last_error].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Provisioning queue"
        description="Hosting accounts, domain registrations and SMS credit packs awaiting fulfilment."
        actions={
          <Button onClick={() => void runQueue()} disabled={running}>
            {running ? <RefreshCw className="mr-1 h-4 w-4 animate-spin" /> : <Play className="mr-1 h-4 w-4" />}
            Run queue now
          </Button>
        }
      />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search provider, status, error…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Jobs" description={`${filtered.length} of ${items.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">Created</th>
                <th className="py-3 pr-4 font-medium">Provider</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium text-center">Attempts</th>
                <th className="py-3 pr-4 font-medium">Last error</th>
                <th className="py-3 pr-4 font-medium">Completed</th>
                <th className="py-3 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((j) => (
                <tr key={j.id}>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4 capitalize">{j.provider.replace("_", " ")}</td>
                  <td className="py-3 pr-4"><StatusBadge status={j.status} /></td>
                  <td className="py-3 pr-4 text-center">{j.attempts}</td>
                  <td className="py-3 pr-4 max-w-xs truncate text-xs text-red-700" title={j.last_error ?? undefined}>{j.last_error ?? "—"}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{j.completed_at ? new Date(j.completed_at).toLocaleString() : "—"}</td>
                  <td className="py-3 pr-4 text-right">
                    {(j.status === "failed" || j.status === "cancelled") && (
                      <Button size="sm" variant="outline" onClick={() => void retry(j.id)}>Retry</Button>
                    )}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No jobs match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <p className="text-xs text-muted-foreground">
        DirectAdmin (hosting), ResellerClub (domains) and Africa's Talking (SMS) integrations are stubbed. The runner marks jobs succeeded so the
        full pipeline can be exercised. Add provider credentials as secrets and the same runner will go live.
      </p>
    </div>
  );
}
