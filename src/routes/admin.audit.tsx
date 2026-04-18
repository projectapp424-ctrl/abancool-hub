import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard } from "@/components/dashboard/Shell";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/audit")({
  component: AdminAudit,
});

interface Row {
  id: string;
  actor_id: string;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

function AdminAudit() {
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("admin_audit_log")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(300);
      setRows((data as Row[]) ?? []);
    })();
  }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [r.action, r.target_type, r.target_id].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Audit log" description="Every staff action that affects customer data." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search action, target…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Activity" description={`${filtered.length} entries`}>
        <ul className="divide-y divide-border">
          {filtered.map((r) => (
            <li key={r.id} className="py-3 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <span className="font-medium capitalize">{r.action.replace(/_/g, " ")}</span>
                  {r.target_type && (
                    <span className="ml-2 text-xs text-muted-foreground">→ {r.target_type} {r.target_id?.slice(0, 8)}</span>
                  )}
                </div>
                <span className="text-xs text-muted-foreground">{new Date(r.created_at).toLocaleString()}</span>
              </div>
              {r.metadata && Object.keys(r.metadata).length > 0 && (
                <pre className="mt-1 overflow-x-auto rounded bg-secondary px-3 py-2 text-xs text-muted-foreground">
                  {JSON.stringify(r.metadata, null, 2)}
                </pre>
              )}
            </li>
          ))}
          {filtered.length === 0 && <li className="py-10 text-center text-sm text-muted-foreground">No audit entries match.</li>}
        </ul>
      </PanelCard>
    </div>
  );
}
