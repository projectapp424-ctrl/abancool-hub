import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/services")({
  component: AdminServices,
});

interface Svc {
  id: string;
  user_id: string;
  type: string;
  name: string;
  domain_name: string | null;
  status: string;
  billing_cycle: string;
  price: number;
  next_renewal_at: string | null;
  created_at: string;
}

function AdminServices() {
  const [items, setItems] = useState<Svc[]>([]);
  const [q, setQ] = useState("");

  async function load() {
    const { data } = await supabase
      .from("services")
      .select("id, user_id, type, name, domain_name, status, billing_cycle, price, next_renewal_at, created_at")
      .order("created_at", { ascending: false })
      .limit(300);
    setItems((data as Svc[]) ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function setStatus(id: string, status: string) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("services").update({ status: status as any }).eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Status updated");
    await supabase.rpc("log_admin_action", {
      _action: "service_status_change", _target_type: "service", _target_id: id, _metadata: { status },
    });
    await load();
  }

  const filtered = items.filter((s) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [s.name, s.domain_name, s.type, s.status].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Services" description="All customer services across hosting, domains, POS and SMS." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search name, domain, type, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Services" description={`${filtered.length} of ${items.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">Service</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Domain</th>
                <th className="py-3 pr-4 font-medium">Cycle</th>
                <th className="py-3 pr-4 font-medium text-right">Price</th>
                <th className="py-3 pr-4 font-medium">Renews</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td className="py-3 pr-4 font-medium">{s.name}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{s.type.replace("_", " ")}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{s.domain_name ?? "—"}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{s.billing_cycle.replace("_", " ")}</td>
                  <td className="py-3 pr-4 text-right">{formatKES(Number(s.price))}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{s.next_renewal_at ? new Date(s.next_renewal_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3 pr-4"><StatusBadge status={s.status} /></td>
                  <td className="py-3 pr-4 text-right">
                    <Select value={s.status} onValueChange={(v) => void setStatus(s.id, v)}>
                      <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="pending">Pending</SelectItem>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="suspended">Suspended</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                        <SelectItem value="expired">Expired</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No services match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
