import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Receipt, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { MpesaPaymentDialog } from "@/components/site/MpesaPaymentDialog";
import { toast } from "sonner";

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
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [mpesaOpen, setMpesaOpen] = useState(false);
  const [active, setActive] = useState<Invoice | null>(null);

  async function refresh() {
    if (!user) return;
    const [inv, wal] = await Promise.all([
      supabase.from("invoices")
        .select("id, invoice_number, status, total, currency, created_at, due_at, paid_at")
        .eq("user_id", user.id).order("created_at", { ascending: false }),
      supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
    ]);
    setItems((inv.data as Invoice[]) ?? []);
    setWalletBalance(Number(wal.data?.balance ?? 0));
  }

  useEffect(() => { void refresh(); }, [user]);

  const unpaidTotal = (items ?? []).filter((i) => i.status === "unpaid" || i.status === "overdue").reduce((sum, i) => sum + Number(i.total), 0);

  async function payWithWallet(inv: Invoice) {
    if (walletBalance < Number(inv.total)) { toast.error("Insufficient wallet balance"); return; }
    const { error } = await supabase.rpc("pay_invoice_with_wallet", { _invoice_id: inv.id });
    if (error) { toast.error(error.message); return; }
    toast.success("Invoice paid!");
    await refresh();
  }

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
                  <th className="py-3 pr-4 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(items ?? []).map((i) => {
                  const owed = i.status === "unpaid" || i.status === "overdue";
                  return (
                    <tr key={i.id}>
                      <td className="py-3 pr-4 font-medium">{i.invoice_number}</td>
                      <td className="py-3 pr-4">{new Date(i.created_at).toLocaleDateString()}</td>
                      <td className="py-3 pr-4">{i.due_at ? new Date(i.due_at).toLocaleDateString() : "—"}</td>
                      <td className="py-3 pr-4 font-semibold">{formatKES(Number(i.total))}</td>
                      <td className="py-3 pr-4"><StatusBadge status={i.status} /></td>
                      <td className="py-3 pr-4 text-right">
                        {owed ? (
                          <div className="flex justify-end gap-2">
                            <Button size="sm" variant="outline" onClick={() => void payWithWallet(i)} disabled={walletBalance < Number(i.total)}>
                              <WalletIcon className="mr-1 h-3 w-3" /> Wallet
                            </Button>
                            <Button size="sm" onClick={() => { setActive(i); setMpesaOpen(true); }}>
                              <Smartphone className="mr-1 h-3 w-3" /> M-Pesa
                            </Button>
                          </div>
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

      {active && (
        <MpesaPaymentDialog
          open={mpesaOpen}
          onOpenChange={(v) => { setMpesaOpen(v); if (!v) setActive(null); }}
          amount={Number(active.total)}
          purpose="invoice"
          invoiceId={active.id}
          onSuccess={() => { setTimeout(() => void refresh(), 600); }}
        />
      )}
    </div>
  );
}
