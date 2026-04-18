import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, Download } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

interface Invoice {
  id: string; invoice_number: string; status: string; total: number;
  currency: string; created_at: string; due_at: string | null; paid_at: string | null;
}

function BillingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Invoice[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("invoices")
        .select("id, invoice_number, status, total, currency, created_at, due_at, paid_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as Invoice[]) ?? []);
    })();
  }, [user]);

  const unpaidTotal = (items ?? []).filter((i) => i.status === "unpaid" || i.status === "overdue").reduce((sum, i) => sum + Number(i.total), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Billing" description="Invoices, payments and renewal history." />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase text-muted-foreground">Total invoices</div>
          <div className="mt-2 text-2xl font-bold">{items?.length ?? "—"}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase text-muted-foreground">Outstanding balance</div>
          <div className="mt-2 text-2xl font-bold text-amber-700">{formatKES(unpaidTotal)}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase text-muted-foreground">Payment methods</div>
          <div className="mt-2 text-sm font-medium">M-Pesa, Card, Wallet</div>
          <p className="mt-1 text-xs text-muted-foreground">Live integrations coming soon</p>
        </div>
      </div>

      <PanelCard title="Invoices" description={items ? `${items.length} invoice(s)` : "Loading..."}>
        {items && items.length === 0 ? (
          <EmptyState
            icon={<Receipt className="h-5 w-5" />}
            title="No invoices yet"
            description="Invoices appear here as soon as you place an order."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Invoice</th>
                  <th className="py-3 pr-4 font-medium">Issued</th>
                  <th className="py-3 pr-4 font-medium">Due</th>
                  <th className="py-3 pr-4 font-medium">Total</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(items ?? []).map((i) => (
                  <tr key={i.id}>
                    <td className="py-3 pr-4 font-medium">{i.invoice_number}</td>
                    <td className="py-3 pr-4">{new Date(i.created_at).toLocaleDateString()}</td>
                    <td className="py-3 pr-4">{i.due_at ? new Date(i.due_at).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4 font-semibold">{formatKES(Number(i.total))}</td>
                    <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                    <td className="py-3 pr-4 text-right">
                      <Button size="sm" variant="ghost" disabled>
                        <Download className="mr-1 h-3 w-3" /> PDF
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
