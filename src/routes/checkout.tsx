import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2, ShoppingCart, ArrowLeft, ShieldCheck, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { useCart } from "@/lib/cart";
import { SiteLayout } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/components/dashboard/Shell";
import { placeOrder, linkOrCreateWhmcsClient } from "@/lib/whmcs.functions";
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
  const { user, profile, loading } = useAuth();
  const { items, subtotal, clear } = useCart();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ orderId: number; invoiceId: number } | null>(null);

  useEffect(() => {
    if (!loading && !user) void nav({ to: "/login" });
  }, [loading, user, nav]);

  async function placeOrderNow() {
    if (items.length === 0) {
      toast.error("Your cart is empty");
      return;
    }
    setBusy(true);
    try {
      // Make sure user has a billing client record
      if (profile && user) {
        await linkOrCreateWhmcsClient({
          data: {
            firstName: profile.first_name || "Customer",
            lastName: profile.last_name || (user.email?.split("@")[0] ?? "User"),
            email: user.email!,
            phone: profile.phone || undefined,
            companyName: profile.company || undefined,
            country: profile.country || "KE",
          },
        });
      }
      const r = await placeOrder({
        data: {
          items: items.map((it) => ({
            pid: it.pid,
            billingCycle: it.billingCycle,
            domain: it.domain || undefined,
            quantity: it.quantity,
          })),
          paymentMethod: "mpesa",
        },
      });
      setDone(r);
      clear();
      toast.success("Order placed! Pay your invoice to activate services.");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not place order");
    } finally {
      setBusy(false);
    }
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

  if (done) {
    return (
      <SiteLayout>
        <div className="container-x py-20 text-center">
          <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <ShoppingCart className="h-6 w-6" />
          </div>
          <h1 className="mt-4 text-2xl font-bold">Order placed</h1>
          <p className="mt-2 text-muted-foreground">
            Order #{done.orderId} created. Invoice #{done.invoiceId} is awaiting payment.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button asChild>
              <Link to="/dashboard/billing">View invoice</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link to="/dashboard">Go to dashboard</Link>
            </Button>
          </div>
        </div>
      </SiteLayout>
    );
  }

  if (items.length === 0) {
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

  return (
    <SiteLayout>
      <div className="container-x py-12">
        <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="mr-1 h-4 w-4" /> Continue shopping
        </Link>
        <h1 className="mt-3 text-3xl font-bold tracking-tight">Checkout</h1>
        <p className="mt-1 text-sm text-muted-foreground">Review your order and place it. We'll create an invoice you can pay right after.</p>

        <div className="mt-8 grid gap-8 lg:grid-cols-[1fr_380px]">
          <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
            <h2 className="text-base font-semibold">Order summary</h2>
            <ul className="mt-4 divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="flex items-start justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{it.name} {it.quantity > 1 && <span className="text-muted-foreground">× {it.quantity}</span>}</div>
                    {it.domain && <div className="text-xs text-muted-foreground">{it.domain}</div>}
                    <div className="mt-0.5 text-xs capitalize text-muted-foreground">{it.billingCycle}</div>
                  </div>
                  <div className="font-semibold">{formatKES(it.price * it.quantity)}</div>
                </li>
              ))}
            </ul>
            <div className="mt-4 space-y-1 border-t border-border pt-4 text-sm">
              <div className="flex justify-between text-muted-foreground"><span>Subtotal</span><span>{formatKES(subtotal)}</span></div>
              <div className="flex justify-between text-muted-foreground"><span>Tax</span><span>Calculated on invoice</span></div>
              <div className="flex justify-between pt-2 text-base font-bold"><span>Total</span><span>{formatKES(subtotal)}</span></div>
            </div>
          </div>

          <div className="space-y-4">
            <div className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
              <h2 className="text-base font-semibold">Place order</h2>
              <p className="mt-2 text-sm text-muted-foreground">
                We'll generate an invoice in your dashboard. Pay with M-Pesa, card or wallet from there.
              </p>
              <Button
                onClick={() => void placeOrderNow()}
                disabled={busy}
                className="mt-4 w-full"
              >
                {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                {busy ? "Placing order…" : "Place order"}
              </Button>
              <p className="mt-4 flex items-center gap-1 text-xs text-muted-foreground">
                <ShieldCheck className="h-3 w-3" /> Secure checkout. We never store payment credentials.
              </p>
              <p className="mt-2 text-xs text-muted-foreground">
                Need a custom quote? <Link to="/contact" className="text-primary hover:underline inline-flex items-center">Talk to sales <ExternalLink className="ml-0.5 h-3 w-3" /></Link>
              </p>
            </div>
          </div>
        </div>
      </div>
    </SiteLayout>
  );
}
