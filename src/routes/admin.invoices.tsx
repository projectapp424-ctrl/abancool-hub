import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, RotateCcw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/invoices")({
  component: AdminInvoices,
});

interface Inv {
  id: string;
  user_id: string;
  invoice_number: string;
  status: string;
  total: number;
  currency: string;
  created_at: string;
  due_at: string | null;
  paid_at: string | null;
  payment_method: string | null;
}

function AdminInvoices() {
  const [items, setItems] = useState<Inv[]>([]);
  const [q, setQ] = useState("");
  const [refundOf, setRefundOf] = useState<Inv | null>(null);
  const [reason, setReason] = useState("");

  async function load() {
    const { data } = await supabase
      .from("invoices")
      .select("id, user_id, invoice_number, status, total, currency, created_at, due_at, paid_at, payment_method")
      .order("created_at", { ascending: false })
      .limit(300);
    setItems((data as Inv[]) ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function refund() {
    if (!refundOf) return;
    const { error } = await supabase.rpc("admin_refund_invoice", { _invoice_id: refundOf.id, _reason: reason || null });
    if (error) { toast.error(error.message); return; }
    toast.success("Refunded to wallet");
    setRefundOf(null); setReason("");
    await load();
  }

  const filtered = items.filter((i) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [i.invoice_number, i.status, i.payment_method].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Invoices" description="All invoices across the platform with refund capability." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search invoice #, status, method…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Invoices" description={`${filtered.length} of ${items.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">Invoice</th>
                <th className="py-3 pr-4 font-medium">Issued</th>
                <th className="py-3 pr-4 font-medium">Due</th>
                <th className="py-3 pr-4 font-medium">Method</th>
                <th className="py-3 pr-4 font-medium text-right">Total</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <tr key={i.id}>
                  <td className="py-3 pr-4 font-medium">{i.invoice_number}</td>
                  <td className="py-3 pr-4">{new Date(i.created_at).toLocaleDateString()}</td>
                  <td className="py-3 pr-4">{i.due_at ? new Date(i.due_at).toLocaleDateString() : "—"}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{i.payment_method ?? "—"}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatKES(Number(i.total))}</td>
                  <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                  <td className="py-3 pr-4 text-right">
                    {i.status === "paid" ? (
                      <Button size="sm" variant="outline" onClick={() => setRefundOf(i)}>
                        <RotateCcw className="mr-1 h-3 w-3" /> Refund
                      </Button>
                    ) : <span className="text-xs text-muted-foreground">—</span>}
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No invoices match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Dialog open={!!refundOf} onOpenChange={(v) => { if (!v) { setRefundOf(null); setReason(""); } }}>
        <DialogContent>
          <DialogHeader><DialogTitle>Refund invoice {refundOf?.invoice_number}</DialogTitle></DialogHeader>
          {refundOf && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                The full amount of <strong>{formatKES(Number(refundOf.total))}</strong> will be credited back to the customer's wallet.
              </p>
              <div className="space-y-1.5">
                <Label>Reason (recorded in audit log)</Label>
                <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Customer requested cancellation" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setRefundOf(null)}>Cancel</Button>
            <Button onClick={() => void refund()}>Confirm refund</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
