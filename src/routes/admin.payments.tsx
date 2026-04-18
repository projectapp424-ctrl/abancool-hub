import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";

export const Route = createFileRoute("/admin/payments")({
  component: AdminPayments,
});

interface Att {
  id: string;
  user_id: string;
  invoice_id: string | null;
  method: string;
  status: string;
  amount: number;
  currency: string;
  phone: string | null;
  provider_receipt: string | null;
  purpose: string;
  created_at: string;
  error_message: string | null;
}

function AdminPayments() {
  const [items, setItems] = useState<Att[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("payment_attempts")
        .select("id, user_id, invoice_id, method, status, amount, currency, phone, provider_receipt, purpose, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(300);
      setItems((data as Att[]) ?? []);
    })();
  }, []);

  const filtered = items.filter((i) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [i.method, i.status, i.phone, i.provider_receipt, i.purpose].filter(Boolean).some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Payment attempts" description="Every M-Pesa STK push and wallet transaction." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search receipt, phone, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Attempts" description={`${filtered.length} of ${items.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">When</th>
                <th className="py-3 pr-4 font-medium">Purpose</th>
                <th className="py-3 pr-4 font-medium">Method</th>
                <th className="py-3 pr-4 font-medium">Phone</th>
                <th className="py-3 pr-4 font-medium text-right">Amount</th>
                <th className="py-3 pr-4 font-medium">Receipt</th>
                <th className="py-3 pr-4 font-medium">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((i) => (
                <tr key={i.id} title={i.error_message ?? undefined}>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{new Date(i.created_at).toLocaleString()}</td>
                  <td className="py-3 pr-4 capitalize">{i.purpose.replace("_", " ")}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{i.method}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{i.phone ?? "—"}</td>
                  <td className="py-3 pr-4 text-right font-semibold">{formatKES(Number(i.amount))}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{i.provider_receipt ?? "—"}</td>
                  <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No payment attempts match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>
    </div>
  );
}
