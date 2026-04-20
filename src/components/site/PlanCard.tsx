import { Check } from "lucide-react";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { formatKES } from "@/components/dashboard/Shell";
import { cn } from "@/lib/utils";
import type { Product } from "@/lib/whmcs-types";

type Cycle = "monthly" | "quarterly" | "semiannually" | "annually" | "biennially" | "triennially" | "onetime";

const cycleSuffix: Record<Cycle, string> = {
  monthly: "/mo",
  quarterly: "/3mo",
  semiannually: "/6mo",
  annually: "/yr",
  biennially: "/2yr",
  triennially: "/3yr",
  onetime: " once",
};

function pickBestCycle(p: Product): { cycle: Cycle; price: number } {
  // Prefer monthly → annually → other > 0
  const order: Cycle[] = ["monthly", "annually", "quarterly", "semiannually", "biennially", "triennially", "onetime"];
  for (const c of order) {
    const v = p.pricing[c];
    if (v > 0) return { cycle: c, price: v };
  }
  return { cycle: "monthly", price: 0 };
}

export function PlanCard({ product, highlighted }: { product: Product; highlighted?: boolean }) {
  const { cycle, price } = pickBestCycle(product);
  const tagline = product.description.replace(/<[^>]+>/g, " ").slice(0, 110);

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition",
        highlighted ? "border-primary shadow-[var(--shadow-elegant)]" : "border-border",
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-bold">{product.name}</h3>
      {tagline && <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{tagline}</p>}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">
          {price > 0 ? formatKES(price) : "Contact us"}
        </span>
        {price > 0 && <span className="text-sm text-muted-foreground">{cycleSuffix[cycle]}</span>}
      </div>
      {product.features.length > 0 && (
        <ul className="mt-5 flex-1 space-y-2 text-sm">
          {product.features.slice(0, 8).map((f, i) => (
            <li key={`${f}-${i}`} className="flex items-start gap-2">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
              <span>{f}</span>
            </li>
          ))}
        </ul>
      )}
      <div className="mt-6">
        <AddToCartButton
          product={{
            pid: product.pid,
            name: product.name,
            price,
            billingCycle: cycle,
            category: product.category,
          }}
          variant={highlighted ? "default" : "outline"}
          disabled={price <= 0}
          label={price > 0 ? "Add to cart" : "Contact sales"}
        />
      </div>
    </div>
  );
}
