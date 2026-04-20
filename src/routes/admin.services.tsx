import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { adminGetServices, adminSetServiceStatus } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/services")({
  component: AdminServices,
});

interface Svc {
  id: number;
  productId: number;
  clientId: number;
  clientName: string;
  clientEmail: string;
  name: string;
  domain: string | null;
  status: string;
  billingCycle: string;
  amount: number;
  category: string;
  nextDueDate: string | null;
}

function AdminServices() {
  const [items, setItems] = useState<Svc[] | null>(null);
  const [q, setQ] = useState("");

  async function load() {
    const r = await adminGetServices().catch(() => ({ services: [] }));
    setItems(r.services as Svc[]);
  }
  useEffect(() => { void load(); }, []);

  async function setStatus(id: number, action: "suspend" | "unsuspend" | "terminate") {
    try {
      await adminSetServiceStatus({ data: { serviceId: id, action } });
      toast.success(`Service ${action}d`);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  const filtered = (items ?? []).filter((s) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [s.name, s.domain, s.clientName, s.clientEmail, s.category, s.status]
      .filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Services" description="All customer services across hosting, POS and more." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search service, customer, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Services" description={items ? `${filtered.length} of ${items.length}` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Service</th>
                  <th className="py-3 pr-4 font-medium">Customer</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
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
                    <td className="py-3 pr-4">
                      <div className="font-medium">{s.name}</div>
                      {s.domain && <div className="text-xs text-muted-foreground">{s.domain}</div>}
                    </td>
                    <td className="py-3 pr-4 text-xs">
                      <div>{s.clientName}</div>
                      <div className="text-muted-foreground">{s.clientEmail}</div>
                    </td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{s.category.replace("_", " ")}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{s.billingCycle}</td>
                    <td className="py-3 pr-4 text-right">{formatKES(Number(s.amount))}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4"><StatusBadge status={s.status} /></td>
                    <td className="py-3 pr-4 text-right">
                      <Select onValueChange={(v) => void setStatus(s.id, v as "suspend" | "unsuspend" | "terminate")}>
                        <SelectTrigger className="h-8 w-32"><SelectValue placeholder="Action" /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value="suspend">Suspend</SelectItem>
                          <SelectItem value="unsuspend">Unsuspend</SelectItem>
                          <SelectItem value="terminate">Terminate</SelectItem>
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
        )}
      </PanelCard>
    </div>
  );
}
