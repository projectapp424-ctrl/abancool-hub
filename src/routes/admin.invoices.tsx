import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { adminGetInvoices, type Invoice } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/invoices")({
  component: AdminInvoices,
});

interface Inv extends Invoice {
  clientId: number;
  clientName: string;
}

function AdminInvoices() {
  const [items, setItems] = useState<Inv[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const r = await adminGetInvoices({ data: {} }).catch(() => ({ invoices: [] }));
      setItems(r.invoices as Inv[]);
    })();
  }, []);

  const filtered = (items ?? []).filter((i) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [i.invoiceNumber, i.status, i.paymentMethod, i.clientName].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Invoices" description="All invoices across the platform." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search invoice, customer, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Invoices" description={items ? `${filtered.length} of ${items.length}` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Invoice</th>
                  <th className="py-3 pr-4 font-medium">Customer</th>
                  <th className="py-3 pr-4 font-medium">Issued</th>
                  <th className="py-3 pr-4 font-medium">Due</th>
                  <th className="py-3 pr-4 font-medium">Method</th>
                  <th className="py-3 pr-4 font-medium text-right">Total</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 pr-4 font-medium">{i.invoiceNumber}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{i.clientName || "—"}</td>
                    <td className="py-3 pr-4">{i.date ? new Date(i.date).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{i.paymentMethod ?? "—"}</td>
                    <td className="py-3 pr-4 text-right font-semibold">{formatKES(Number(i.total))}</td>
                    <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No invoices match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
