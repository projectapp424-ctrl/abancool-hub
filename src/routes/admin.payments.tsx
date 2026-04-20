import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { Input } from "@/components/ui/input";
import { adminGetTransactions } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

interface Tx {
  id: number;
  transid: string;
  date: string;
  amount: number;
  gateway: string;
  description: string;
  userid: number;
  invoiceId: number;
  currency: string;
}

function AdminPayments() {
  const [items, setItems] = useState<Tx[] | null>(null);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const r = await adminGetTransactions().catch(() => ({ transactions: [] }));
      setItems(r.transactions);
    })();
  }, []);

  const filtered = (items ?? []).filter((i) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [i.transid, i.gateway, i.description].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Payments" description="Every transaction recorded on the billing platform." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search receipt, gateway, description…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Transactions" description={items ? `${filtered.length} of ${items.length}` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">When</th>
                  <th className="py-3 pr-4 font-medium">Receipt</th>
                  <th className="py-3 pr-4 font-medium">Gateway</th>
                  <th className="py-3 pr-4 font-medium">Description</th>
                  <th className="py-3 pr-4 font-medium">Invoice</th>
                  <th className="py-3 pr-4 font-medium text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{i.date ? new Date(i.date).toLocaleString() : "—"}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{i.transid || "—"}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{i.gateway || "—"}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{i.description || "—"}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{i.invoiceId || "—"}</td>
                    <td className={"py-3 pr-4 text-right font-semibold " + (i.amount < 0 ? "text-red-700" : "")}>
                      {formatKES(Number(i.amount))}
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No transactions match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
