import { ShoppingCart } from "lucide-react";
import { useCart, type CartItem } from "@/lib/cart";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  product: Omit<CartItem, "id" | "quantity">;
  label?: string;
  className?: string;
  variant?: "default" | "outline" | "secondary";
  size?: "default" | "sm" | "lg";
  fullWidth?: boolean;
  disabled?: boolean;
}

export function AddToCartButton({
  product,
  label = "Order Now",
  className,
  variant = "default",
  size = "default",
  fullWidth = true,
  disabled,
}: Props) {
  const { add } = useCart();

  return (
    <Button
      onClick={() => add(product)}
      disabled={disabled || product.price <= 0}
      variant={variant}
      size={size}
      className={cn(fullWidth && "w-full", className)}
    >
      <ShoppingCart className="mr-2 h-4 w-4" />
      {label}
    </Button>
  );
}
