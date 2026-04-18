import { useNavigate } from "@tanstack/react-router";
import { ShoppingCart, Loader2 } from "lucide-react";
import { useState } from "react";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface Props {
  planId?: string;
  custom?: {
    name: string;
    type: string;
    price: number;
    billing_cycle?: string;
  };
  domainName?: string;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
}

export function AddToCartButton({
  planId,
  custom,
  domainName,
  label = "Order Now",
  className,
  variant = "default",
  size = "default",
  fullWidth = true,
}: Props) {
  const { user } = useAuth();
  const { addPlan, addCustom } = useCart();
  const nav = useNavigate();
  const [busy, setBusy] = useState(false);

  async function onClick() {
    if (!user) {
      toast.info("Sign in to continue your order.");
      void nav({ to: "/login", search: { redirect: "/checkout" } as never });
      return;
    }
    setBusy(true);
    try {
      if (planId) await addPlan(planId, { domain_name: domainName });
      else if (custom) await addCustom({ ...custom, domain_name: domainName });
    } finally {
      setBusy(false);
    }
  }

  return (
    <Button
      onClick={onClick}
      disabled={busy}
      variant={variant}
      size={size}
      className={cn(fullWidth && "w-full", className)}
    >
      {busy ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShoppingCart className="mr-2 h-4 w-4" />}
      {label}
    </Button>
  );
}
