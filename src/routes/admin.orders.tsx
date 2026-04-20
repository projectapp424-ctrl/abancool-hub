import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2, Check, X } from "lucide-react";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { adminGetOrders, adminAcceptOrder, adminCancelOrder } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/orders")({
  component: AdminOrders,
});

interface Order {
  id: number;
  ordernum: string;
  userid: number;
  name: string;
  date: string;
  amount: number;
  status: string;
  paymentMethod: string;
}

function AdminOrders() {
  const [items, setItems] = useState<Order[] | null>(null);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState<number | null>(null);

  async function load() {
    const r = await adminGetOrders().catch(() => ({ orders: [] }));
    setItems(r.orders);
  }
  useEffect(() => { void load(); }, []);

  async function accept(id: number) {
    setBusy(id);
    try {
      await adminAcceptOrder({ data: { orderId: id } });
      toast.success("Order accepted");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  async function cancel(id: number) {
    if (!confirm("Cancel this order?")) return;
    setBusy(id);
    try {
      await adminCancelOrder({ data: { orderId: id, cancelSub: false } });
      toast.success("Order cancelled");
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    } finally {
      setBusy(null);
    }
  }

  const filtered = (items ?? []).filter((i) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [i.ordernum, i.name, i.status, i.paymentMethod].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Orders" description="New orders awaiting acceptance and provisioning." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search order #, customer, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Orders" description={items ? `${filtered.length} of ${items.length}` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Order</th>
                  <th className="py-3 pr-4 font-medium">Customer</th>
                  <th className="py-3 pr-4 font-medium">Date</th>
                  <th className="py-3 pr-4 font-medium">Method</th>
                  <th className="py-3 pr-4 font-medium text-right">Amount</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((o) => (
                  <tr key={o.id}>
                    <td className="py-3 pr-4 font-medium">#{o.ordernum}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{o.name}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{o.date ? new Date(o.date).toLocaleString() : "—"}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{o.paymentMethod}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatKES(Number(o.amount))}</td>
                    <td className="py-3 pr-4"><StatusBadge status={o.status} /></td>
                    <td className="py-3 pr-4 text-right">
                      {/pending/i.test(o.status) && (
                        <div className="flex justify-end gap-1">
                          <Button size="sm" onClick={() => void accept(o.id)} disabled={busy === o.id}>
                            <Check className="mr-1 h-3 w-3" /> Accept
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => void cancel(o.id)} disabled={busy === o.id}>
                            <X className="mr-1 h-3 w-3" /> Cancel
                          </Button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No orders match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
