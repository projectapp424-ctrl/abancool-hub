import { Check, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatKES } from "@/components/dashboard/Shell";
import { cn } from "@/lib/utils";
import { whmcsOrderUrl, type PublicPackage } from "@/lib/whmcs-public";

const cycleSuffix: Record<PublicPackage["cycle"], string> = {
  monthly: "/mo",
  annually: "/yr",
};

export function ExternalPlanCard({ pkg, highlighted }: { pkg: PublicPackage; highlighted?: boolean }) {
  const isHot = highlighted ?? pkg.popular;
  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border bg-card p-6 shadow-[var(--shadow-soft)] transition",
        isHot ? "border-primary shadow-[var(--shadow-elegant)]" : "border-border",
      )}
    >
      {isHot && (
        <span className="absolute -top-3 left-6 rounded-full bg-primary px-3 py-0.5 text-xs font-semibold text-primary-foreground">
          Most popular
        </span>
      )}
      <h3 className="text-lg font-bold">{pkg.name}</h3>
      <p className="mt-1 text-xs uppercase tracking-wide text-muted-foreground">{pkg.group}</p>
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">{formatKES(pkg.price)}</span>
        <span className="text-sm text-muted-foreground">{cycleSuffix[pkg.cycle]}</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {pkg.features.map((f, i) => (
          <li key={`${f}-${i}`} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <Button asChild variant={isHot ? "default" : "outline"} className="w-full">
          <a href={whmcsOrderUrl(pkg.pid)} target="_blank" rel="noopener noreferrer">
            Order Now
            <ExternalLink className="ml-2 h-4 w-4" />
          </a>
        </Button>
      </div>
    </div>
  );
}
