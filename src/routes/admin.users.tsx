import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { adminGetClients, type AdminClientRow } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

function AdminUsers() {
  const [rows, setRows] = useState<AdminClientRow[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const r = await adminGetClients({ data: {} }).catch(() => ({ clients: [] }));
      setRows(r.clients);
    })();
  }, []);

  const filtered = (rows ?? []).filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.firstName, r.lastName, r.email, r.companyName, r.status]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(s));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Customers" description="All billing accounts on the platform." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search name, email, company…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="All customers" description={rows ? `${filtered.length} of ${rows.length}` : "Loading..."}>
        {rows === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Name</th>
                  <th className="py-3 pr-4 font-medium">Email</th>
                  <th className="py-3 pr-4 font-medium">Company</th>
                  <th className="py-3 pr-4 font-medium text-right">Credit</th>
                  <th className="py-3 pr-4 font-medium">Joined</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((u) => (
                  <tr key={u.id}>
                    <td className="py-3 pr-4 font-medium">{[u.firstName, u.lastName].filter(Boolean).join(" ") || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.email}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{u.companyName ?? "—"}</td>
                    <td className="py-3 pr-4 text-right font-medium">{formatKES(u.credit)}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{u.datecreated ? new Date(u.datecreated).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4"><StatusBadge status={u.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No customers match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
