import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, Loader2, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { getMyInvoices, type Invoice } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/billing")({
  component: BillingPage,
});

function BillingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Invoice[] | null>(null);
  const [walletBalance, setWalletBalance] = useState(0);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const [inv, wal] = await Promise.all([
        getMyInvoices().catch(() => ({ invoices: [] })),
        supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
      ]);
      setItems(inv.invoices);
      setWalletBalance(Number(wal.data?.balance ?? 0));
    })();
  }, [user]);

  const unpaidTotal = (items ?? [])
    .filter((i) => /unpaid|overdue/i.test(i.status))
    .reduce((sum, i) => sum + Number(i.total), 0);

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
          <div className="text-xs uppercase text-muted-foreground">Wallet balance</div>
          <div className="mt-2 text-2xl font-bold">{formatKES(walletBalance)}</div>
        </div>
      </div>

      <PanelCard title="Invoices" description={items ? `${items.length} invoice(s)` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
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
                  <th className="py-3 pr-4 font-medium">Method</th>
                  <th className="py-3 pr-4 font-medium">Total</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                  <th className="py-3 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((i) => {
                  const owed = /unpaid|overdue/i.test(i.status);
                  return (
                    <tr key={i.id}>
                      <td className="py-3 pr-4 font-medium">{i.invoiceNumber}</td>
                      <td className="py-3 pr-4">{i.date ? new Date(i.date).toLocaleDateString() : "—"}</td>
                      <td className="py-3 pr-4">{i.dueDate ? new Date(i.dueDate).toLocaleDateString() : "—"}</td>
                      <td className="py-3 pr-4 capitalize text-muted-foreground">{i.paymentMethod ?? "—"}</td>
                      <td className="py-3 pr-4 font-semibold">{formatKES(Number(i.total))}</td>
                      <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                      <td className="py-3 pr-4 text-right">
                        {owed ? (
                          <Button size="sm" asChild>
                            <Link to="/contact">
                              Pay now <ExternalLink className="ml-1 h-3 w-3" />
                            </Link>
                          </Button>
                        ) : <span className="text-xs text-muted-foreground">—</span>}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
      <p className="text-xs text-muted-foreground">
        Online payment (M-Pesa, card) launches with the next release. In the meantime, contact us to settle outstanding invoices.
      </p>
    </div>
  );
}
