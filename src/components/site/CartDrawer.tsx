import { Link, useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Trash2, Minus, Plus, ArrowRight } from "lucide-react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger, SheetFooter } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { formatKES } from "@/components/dashboard/Shell";

export function CartButton() {
  const { count, open, setOpen } = useCart();
  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" aria-label="Open cart">
          <ShoppingCart className="h-5 w-5" />
          {count > 0 && (
            <span className="absolute -right-1 -top-1 flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-primary-foreground">
              {count}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <CartContents />
    </Sheet>
  );
}

function CartContents() {
  const { items, subtotal, remove, setQuantity, setOpen } = useCart();
  const nav = useNavigate();

  return (
    <SheetContent className="flex w-full flex-col sm:max-w-md">
      <SheetHeader>
        <SheetTitle>Your cart</SheetTitle>
      </SheetHeader>

      {items.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <ShoppingCart className="h-10 w-10 text-muted-foreground" />
          <p className="mt-4 text-sm font-medium">Your cart is empty</p>
          <p className="mt-1 text-xs text-muted-foreground">Browse our services to get started.</p>
          <div className="mt-5 flex gap-2">
            <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
              <Link to="/hosting">Hosting</Link>
            </Button>
            <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
              <Link to="/pos-systems">POS</Link>
            </Button>
            <Button variant="outline" size="sm" asChild onClick={() => setOpen(false)}>
              <Link to="/bulk-sms">SMS</Link>
            </Button>
          </div>
        </div>
      ) : (
        <>
          <div className="-mx-6 flex-1 overflow-y-auto px-6">
            <ul className="divide-y divide-border">
              {items.map((it) => (
                <li key={it.id} className="py-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{it.name}</div>
                      {it.domain && (
                        <div className="text-xs text-muted-foreground">{it.domain}</div>
                      )}
                      <div className="mt-0.5 text-xs capitalize text-muted-foreground">
                        {formatKES(it.price)} · {it.billingCycle}
                      </div>
                    </div>
                    <button
                      onClick={() => remove(it.id)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Remove"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQuantity(it.id, it.quantity - 1)}
                        disabled={it.quantity <= 1}
                      >
                        <Minus className="h-3 w-3" />
                      </Button>
                      <span className="w-8 text-center text-sm">{it.quantity}</span>
                      <Button
                        size="icon"
                        variant="outline"
                        className="h-7 w-7"
                        onClick={() => setQuantity(it.id, it.quantity + 1)}
                      >
                        <Plus className="h-3 w-3" />
                      </Button>
                    </div>
                    <div className="text-sm font-semibold">{formatKES(it.price * it.quantity)}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <SheetFooter className="border-t border-border pt-4">
            <div className="w-full space-y-3">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Subtotal</span>
                <span className="text-base font-semibold">{formatKES(subtotal)}</span>
              </div>
              <Button
                className="w-full"
                onClick={() => {
                  setOpen(false);
                  void nav({ to: "/checkout" });
                }}
              >
                Checkout <ArrowRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </SheetFooter>
        </>
      )}
    </SheetContent>
  );
}
