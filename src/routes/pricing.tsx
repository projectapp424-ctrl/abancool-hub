import { createFileRoute, Link } from "@tanstack/react-router";
import { useState } from "react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PriceCard } from "@/components/site/PriceCard";
import { Button } from "@/components/ui/button";

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

const data: Record<(typeof tabs)[number], Parameters<typeof PriceCard>[0][]> = {
  Hosting: [
    {
      name: "Shared Starter",
      price: "KSh 299",
      description: "Personal sites and small landing pages.",
      features: ["1 Website", "10 GB SSD", "5 Emails", "Free SSL", "DirectAdmin"],
    },
    {
      name: "Business Pro",
      price: "KSh 899",
      description: "Growing businesses needing real performance.",
      features: ["Unlimited sites", "100 GB NVMe", "Unlimited Emails", "Daily backups", "Free domain"],
      highlighted: true,
    },
    {
      name: "Reseller",
      price: "KSh 2,499",
      description: "Sell hosting under your own brand.",
      features: ["50 cPanel accounts", "200 GB NVMe", "White-label DNS", "Free migrations", "Priority support"],
    },
  ],
  POS: [
    {
      name: "Starter",
      price: "KSh 1,500",
      description: "One outlet getting started.",
      features: ["1 Branch", "2 Cashiers", "Unlimited products", "Daily reports", "Email support"],
    },
    {
      name: "Growth",
      price: "KSh 3,500",
      description: "Multi-cashier businesses.",
      features: ["3 Branches", "10 Staff", "Inventory & suppliers", "Advanced reports", "Priority support"],
      highlighted: true,
    },
    {
      name: "Enterprise",
      price: "KSh 7,500",
      description: "Chains and franchises.",
      features: ["Unlimited branches", "Unlimited staff", "Custom integrations", "Account manager", "On-site training"],
    },
  ],
  SMS: [
    {
      name: "Starter Pack",
      price: "KSh 800",
      period: "",
      description: "Testing and small campaigns.",
      features: ["1,000 credits", "1 Sender ID", "Delivery reports", "CSV upload", "Email support"],
    },
    {
      name: "Business Pack",
      price: "KSh 3,500",
      period: "",
      description: "Regular customer engagement.",
      features: ["5,000 credits", "3 Sender IDs", "API access", "Priority support", "Delivery reports"],
      highlighted: true,
    },
    {
      name: "Enterprise Pack",
      price: "KSh 12,000",
      period: "",
      description: "High-volume marketing & transactional.",
      features: ["20,000 credits", "Unlimited Sender IDs", "Dedicated route", "Account manager", "99.9% SLA"],
    },
  ],
};

function PricingPage() {
  const [active, setActive] = useState<(typeof tabs)[number]>("Hosting");
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

          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {data[active].map((p) => (
              <PriceCard key={p.name} {...p} />
            ))}
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
