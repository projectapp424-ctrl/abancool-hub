import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export interface PriceCardProps {
  name: string;
  price: string;
  period?: string;
  description: string;
  features: string[];
  highlighted?: boolean;
  ctaLabel?: string;
}

export function PriceCard({
  name,
  price,
  period = "/mo",
  description,
  features,
  highlighted,
  ctaLabel = "Order Now",
}: PriceCardProps) {
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 transition-all",
        highlighted
          ? "border-primary shadow-[var(--shadow-glow)] ring-1 ring-primary/30"
          : "border-border shadow-[var(--shadow-soft)] hover:shadow-[var(--shadow-elevated)]",
      )}
    >
      {highlighted && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground">
          Most Popular
        </span>
      )}
      <h3 className="text-lg font-semibold text-foreground">{name}</h3>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-5 flex items-baseline gap-1">
        <span className="text-4xl font-bold tracking-tight">{price}</span>
        <span className="text-sm text-muted-foreground">{period}</span>
      </div>
      <ul className="mt-6 flex-1 space-y-3 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary-soft text-primary">
              <Check className="h-3 w-3" />
            </span>
            <span className="text-foreground/80">{f}</span>
          </li>
        ))}
      </ul>
      <Button className="mt-7 w-full" variant={highlighted ? "default" : "outline"}>
        {ctaLabel}
      </Button>
    </div>
  );
}
