import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export interface CartItem {
  id: string;
  user_id: string;
  plan_id: string | null;
  custom_name: string | null;
  custom_type: string | null;
  custom_price: number | null;
  custom_billing_cycle: string | null;
  domain_name: string | null;
  quantity: number;
  // Joined plan data:
  plan?: {
    id: string;
    name: string;
    type: string;
    price: number;
    billing_cycle: string;
    tagline: string | null;
  } | null;
}

interface CartCtx {
  items: CartItem[];
  count: number;
  subtotal: number;
  loading: boolean;
  open: boolean;
  setOpen: (v: boolean) => void;
  refresh: () => Promise<void>;
  addPlan: (planId: string, opts?: { domain_name?: string; quantity?: number }) => Promise<void>;
  addCustom: (item: {
    name: string;
    type: string;
    price: number;
    billing_cycle?: string;
    domain_name?: string;
    quantity?: number;
  }) => Promise<void>;
  remove: (id: string) => Promise<void>;
  clear: () => Promise<void>;
  setQuantity: (id: string, qty: number) => Promise<void>;
}

const Ctx = createContext<CartCtx | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      return;
    }
    setLoading(true);
    const { data, error } = await supabase
      .from("cart_items")
      .select("*, plan:plans(id, name, type, price, billing_cycle, tagline)")
      .eq("user_id", user.id)
      .order("created_at", { ascending: true });
    if (error) console.error("cart refresh", error);
    setItems((data as unknown as CartItem[]) ?? []);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const addPlan: CartCtx["addPlan"] = async (planId, opts = {}) => {
    if (!user) {
      toast.error("Please sign in to add to cart");
      return;
    }
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      plan_id: planId,
      domain_name: opts.domain_name ?? null,
      quantity: opts.quantity ?? 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Added to cart");
    setOpen(true);
    await refresh();
  };

  const addCustom: CartCtx["addCustom"] = async (item) => {
    if (!user) {
      toast.error("Please sign in to add to cart");
      return;
    }
    const { error } = await supabase.from("cart_items").insert({
      user_id: user.id,
      plan_id: null,
      custom_name: item.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      custom_type: item.type as any,
      custom_price: item.price,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      custom_billing_cycle: (item.billing_cycle ?? "one_time") as any,
      domain_name: item.domain_name ?? null,
      quantity: item.quantity ?? 1,
    });
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Added to cart");
    setOpen(true);
    await refresh();
  };

  const remove: CartCtx["remove"] = async (id) => {
    const { error } = await supabase.from("cart_items").delete().eq("id", id);
    if (error) toast.error(error.message);
    await refresh();
  };

  const setQuantity: CartCtx["setQuantity"] = async (id, qty) => {
    const q = Math.max(1, Math.floor(qty));
    const { error } = await supabase.from("cart_items").update({ quantity: q }).eq("id", id);
    if (error) toast.error(error.message);
    await refresh();
  };

  const clear: CartCtx["clear"] = async () => {
    if (!user) return;
    const { error } = await supabase.from("cart_items").delete().eq("user_id", user.id);
    if (error) toast.error(error.message);
    await refresh();
  };

  const subtotal = items.reduce((sum, it) => {
    const unit = it.plan?.price ?? Number(it.custom_price ?? 0);
    return sum + unit * it.quantity;
  }, 0);

  const value: CartCtx = {
    items,
    count: items.reduce((n, it) => n + it.quantity, 0),
    subtotal,
    loading,
    open,
    setOpen,
    refresh,
    addPlan,
    addCustom,
    remove,
    clear,
    setQuantity,
  };

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useCart() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useCart must be used inside <CartProvider>");
  return v;
}
