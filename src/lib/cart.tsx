/**
 * Local cart for WHMCS-backed checkout.
 *
 * Items are kept in localStorage (anonymous + authenticated). Each item is a
 * snapshot of a WHMCS product the user wants to order. On checkout we send the
 * minimal `pid` + cycle to the server, which calls AddOrder.
 */
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { toast } from "sonner";

const STORAGE_KEY = "abancool.cart.v1";

export interface CartItem {
  /** Local-only id (uuid-ish). */
  id: string;
  /** WHMCS product id. */
  pid: number;
  /** Display name. */
  name: string;
  /** Per-cycle price snapshot. */
  price: number;
  /** WHMCS billing cycle keyword (monthly, annually, etc.) */
  billingCycle: string;
  /** Optional domain for hosting orders. */
  domain?: string | null;
  /** Optional: what category — purely for UI grouping. */
  category?: string;
  quantity: number;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  open: boolean;
  setOpen: (v: boolean) => void;
  add: (item: Omit<CartItem, "id" | "quantity"> & { quantity?: number }) => void;
  remove: (id: string) => void;
  setQuantity: (id: string, qty: number) => void;
  clear: () => void;
}

const Ctx = createContext<CartCtx | null>(null);

function loadInitial(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CartItem[];
    return Array.isArray(parsed) ? parsed.filter((i) => i && typeof i.pid === "number") : [];
  } catch {
    return [];
  }
}

function persist(items: CartItem[]) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  } catch {
    /* ignore quota errors */
  }
}

function uid(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [open, setOpen] = useState(false);

  // Hydrate after mount (avoid SSR mismatch)
  useEffect(() => {
    setItems(loadInitial());
  }, []);

  useEffect(() => {
    persist(items);
  }, [items]);

  const add = useCallback<CartCtx["add"]>((item) => {
    setItems((prev) => {
      // If same pid + cycle + domain already exists, just bump quantity.
      const existing = prev.find(
        (p) => p.pid === item.pid && p.billingCycle === item.billingCycle && (p.domain ?? null) === (item.domain ?? null),
      );
      if (existing) {
        return prev.map((p) =>
          p.id === existing.id ? { ...p, quantity: p.quantity + (item.quantity ?? 1) } : p,
        );
      }
      return [
        ...prev,
        {
          id: uid(),
          pid: item.pid,
          name: item.name,
          price: item.price,
          billingCycle: item.billingCycle,
          domain: item.domain ?? null,
          category: item.category,
          quantity: item.quantity ?? 1,
        },
      ];
    });
    toast.success("Added to cart");
    setOpen(true);
  }, []);

  const remove = useCallback<CartCtx["remove"]>((id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const setQuantity = useCallback<CartCtx["setQuantity"]>((id, qty) => {
    const q = Math.max(1, Math.floor(qty));
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, quantity: q } : p)));
  }, []);

  const clear = useCallback<CartCtx["clear"]>(() => {
    setItems([]);
  }, []);

  const subtotal = useMemo(
    () => items.reduce((sum, it) => sum + Number(it.price) * it.quantity, 0),
    [items],
  );

  const value: CartCtx = {
    items,
    count: items.reduce((n, it) => n + it.quantity, 0),
    subtotal,
    open,
    setOpen,
    add,
    remove,
    setQuantity,
    clear,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}
