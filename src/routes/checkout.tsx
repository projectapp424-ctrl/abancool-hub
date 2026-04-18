import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, ArrowLeft, ShieldCheck, Smartphone, Wallet as WalletIcon } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { supabase } from "@/integrations/supabase/client";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/components/dashboard/Shell";
import { MpesaPaymentDialog } from "@/components/site/MpesaPaymentDialog";
import { toast } from "sonner";

export const Route = createFileRoute("/checkout")({
  head: () => ({
    meta: [
      { title: "Checkout | Abancool Technology" },
      { name: "robots", content: "noindex" },
    ],
  }),
  component: CheckoutPage,
});

function CheckoutPage() {
  const { user, loading } = useAuth();
  const { items, subtotal, refresh } = useCart();
  const nav = useNavigate();
  const [walletBalance, setWalletBalance] = useState<number>(0);
  const [creating, setCreating] = useState(false);
  const [invoiceId, setInvoiceId] = useState<string | null>(null);
  const [invoiceTotal, setInvoiceTotal] = useState<number>(0);
  const [mpesaOpen, setMpesaOpen] = useState(false);

  useEffect(() => {
    if (!loading && !user) void nav({ to: "/login" });
  }, [loading, user, nav]);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("wallet_balances")
        .select("balance")
        .eq("user_id", user.id)
        .maybeSingle();
      setWalletBalance(Number(data?.balance ?? 0));
    })();
  }, [user, invoiceId]);

  async function createInvoice(): Promise<string | null> {
    if (items.length === 0) { toast.error("Your cart is empty"); return null; }
    setCreating(true);
    try {
      const { data, error } = await supabase.rpc("create_invoice_from_cart");
      if (error) throw error;
      const newId = data as unknown as string;
      setInvoiceId(newId);
      setInvoiceTotal(subtotal);
      await refresh();
      return newId;
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not create invoice");
      return null;
    } finally {
      setCreating(false);
    }
  }

  async function payWithWallet() {
    let id = invoiceId;
    if (!id) id = await createInvoice();
    if (!id) return;
    if (walletBalance < (invoiceTotal || subtotal)) {
      toast.error(`Insufficient wallet balance (${formatKES(walletBalance)}). Top up first.`);
      return;
    }
    const { error } = await supabase.rpc("pay_invoice_with_wallet", { _invoice_id: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Paid! Your services are being activated.");
    void nav({ to: "/dashboard" });
  }

  async function payWithMpesa() {
    let id = invoiceId;
    if (!id) id = await createInvoice();
    if (!id) return;
    setMpesaOpen(true);
  }

  if (loading || !user) {
    return (
      <SiteLayout>
        <div className="container-x flex min-h-[60vh] items-center justify-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0 && !invoiceId) {
    return (
      <SiteLayout>
        <div className="container-x py-20 text-center">
          <ShoppingCart className="mx-auto h-10 w-10 text-muted-foreground" />
          <h1 className="mt-4 text-2xl font-bold">Your cart is empty</h1>
          <p className="mt-2 text-muted-foreground">Add a service to start your order.</p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild><Link to="/hosting">Browse hosting</Link></Button>
            <Button variant="outline" asChild><Link to="/pos-systems">POS systems</Link></Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  const total = invoiceTotal || subtotal;

  return (
    <SiteLayout>
      <div className="container-x py-12">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Continue shopping
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review your order and choose a payment method.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-semibold">Order summary</h2>
            <ul className="mt-4 divide-y divide-border">
              {items.map((it) => {
                const name = it.plan?.name ?? it.custom_name ?? "Service";
                const price = Number(it.plan?.price ?? it.custom_price ?? 0);
                const cycle = it.plan?.billing_cycle ?? it.custom_billing_cycle ?? "one_time";
                return (
                  <li key={it.id} className="flex items-start justify-between py-3 text-sm">
                    <div>
                      <div className="font-medium">{name} {it.quantity > 1 && <span className="text-muted-foreground">× {it.quantity}</span>}</div>
                      {it.domain_name && <div className="text-xs text-muted-foreground">{it.domain_name}</div>}
                      <div className="mt-0.5 text-xs capitalize text-muted-foreground">{cycle.replace("_", " ")}</div>
                    </div>
                    <div className="font-semibold">{formatKES(price * it.quantity)}</div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatKES(total)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>{formatKES(0)}</span></div>
              <div className="flex justify-between pt-2 text-base font-bold"><span>Total</span><span>{formatKES(total)}</span></div>
            </div>
            {invoiceId && (
              <p className="mt-3 rounded-md bg-emerald-50 px-3 py-2 text-xs text-emerald-700">
                Invoice created. Complete payment below to activate your services.
              </p>
            )}
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold">Payment method</h2>
              <div className="mt-4 space-y-3">
                <button
                  onClick={() => void payWithMpesa()}
                  disabled={creating}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-secondary/50"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-50 text-emerald-700">
                      <Smartphone className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold">M-Pesa STK Push</div>
                      <div className="text-xs text-muted-foreground">Pay instantly from your phone</div>
                    </div>
                  </div>
                  {creating && <Loader2 className="h-4 w-4 animate-spin" />}
                </button>

                <button
                  onClick={() => void payWithWallet()}
                  disabled={creating || walletBalance < total}
                  className="flex w-full items-center justify-between rounded-xl border border-border bg-background p-4 text-left transition hover:border-primary hover:bg-secondary/50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                      <WalletIcon className="h-5 w-5" />
                    </span>
                    <div>
                      <div className="text-sm font-semibold">Wallet balance</div>
                      <div className="text-xs text-muted-foreground">
                        {formatKES(walletBalance)} available {walletBalance < total && "— top up first"}
                      </div>
                    </div>
                  </div>
                </button>
              </div>
              <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Secure payments. We never store card or M-Pesa PIN data.
              </p>
            </div>
          </div>
        </div>
      </div>

      <MpesaPaymentDialog
        open={mpesaOpen}
        onOpenChange={setMpesaOpen}
        amount={total}
        purpose="invoice"
        invoiceId={invoiceId}
        onSuccess={() => {
          setTimeout(() => void nav({ to: "/dashboard" }), 1500);
        }}
      />
    </SiteLayout>
  );
}
