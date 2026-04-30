import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ExternalPlanCard } from "@/components/site/ExternalPlanCard";
import { Button } from "@/components/ui/button";
import { SHARED_HOSTING, RESELLER_HOSTING, ABAN_HOSTING, type PublicPackage } from "@/lib/whmcs-public";

export const Route = createFileRoute("/pricing")({
  head: () => ({
    meta: [
      { title: "Pricing — Hosting, Reseller & Aban Hosting | Abancool" },
      { name: "description", content: "Transparent pricing for shared, reseller and Aban hosting. No hidden fees, ever." },
      { property: "og:title", content: "Pricing | Abancool Technology" },
      { property: "og:description", content: "All Abancool hosting plans in one place — pick the right service for your business." },
    ],
  }),
  component: PricingPage,
});

const tabs = ["Shared", "Reseller", "Aban"] as const;
type Tab = (typeof tabs)[number];

const groups: Record<Tab, PublicPackage[]> = {
  Shared: SHARED_HOSTING,
  Reseller: RESELLER_HOSTING,
  Aban: ABAN_HOSTING,
};

function PricingPage() {
  const [active, setActive] = useState<Tab>("Shared");

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Pricing"
        title="Honest pricing for every Abancool hosting plan."
        subtitle="Choose the service, click Order Now, and complete checkout securely on our billing portal."
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
                {t} Hosting
              </button>
            ))}
          </div>

          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {groups[active].map((p) => <ExternalPlanCard key={p.pid} pkg={p} />)}
          </div>

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
