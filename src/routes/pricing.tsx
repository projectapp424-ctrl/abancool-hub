import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Loader2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PlanCard } from "@/components/site/PlanCard";
import { Button } from "@/components/ui/button";
import { getProducts } from "@/lib/whmcs.functions";
import type { Product, ProductCategory } from "@/lib/whmcs-types";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hosting, Domains, POS & SMS | Abancool" },
      { name: "description", content: "Transparent pricing across hosting, domains, POS systems and bulk SMS. No hidden fees, ever." },
      { property: "og:title", content: "Pricing | Abancool Technology" },
      { property: "og:description", content: "All Abancool plans in one place — pick the right service for your business." },
    ],
  }),
  component: PricingPage,
});

const tabs = ["Hosting", "POS", "SMS"] as const;
type Tab = (typeof tabs)[number];

function tabForCategory(category: ProductCategory): Tab | null {
  if (["hosting", "reseller_hosting", "vps"].includes(category)) return "Hosting";
  if (category === "pos") return "POS";
  if (category === "sms") return "SMS";
  return null;
}

function PricingPage() {
  const [active, setActive] = useState<Tab>("Hosting");
  const [products, setProducts] = useState<Product[] | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getProducts({ data: { category: "all" } }).catch(() => ({ products: [] }));
      setProducts(r.products);
    })();
  }, []);

  const grouped = useMemo(() => {
    const base: Record<Tab, Product[]> = { Hosting: [], POS: [], SMS: [] };
    for (const product of products ?? []) {
      const tab = tabForCategory(product.category);
      if (tab) base[tab].push(product);
    }
    return base;
  }, [products]);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Pricing"
        title="Honest pricing for every Abancool service."
        subtitle="Choose the service, pick a plan and we'll provision it automatically after payment."
      />

      <section className="py-16">
        <div className="container-x">
          <div className="inline-flex rounded-xl border border-border bg-card p-1 shadow-[var(--shadow-soft)]">
            {tabs.map((t) => (
              <button
                key={t}
                onClick={() => setActive(t)}
                className={
                  "rounded-lg px-5 py-2 text-sm font-medium transition-colors " +
                  (active === t
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground")
                }
              >
                {t}
              </button>
            ))}
          </div>

          {products === null ? (
            <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : grouped[active].length === 0 ? (
            <p className="mt-10 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No {active.toLowerCase()} packages are currently available.</p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {grouped[active].map((p, i) => (
                <PlanCard key={p.pid} product={p} highlighted={i === 1} />
              ))}
            </div>
          )}

          <div className="mt-16 rounded-2xl border border-border bg-secondary/40 p-8 text-center">
            <h3 className="text-xl font-semibold">Need something custom?</h3>
            <p className="mt-2 text-muted-foreground">
              Dedicated servers, custom POS deployments and enterprise SMS routes — let's talk.
            </p>
            <Button className="mt-5" asChild>
              <Link to="/contact">Contact sales</Link>
            </Button>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
