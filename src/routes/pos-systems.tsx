import { createFileRoute } from "@tanstack/react-router";
import { Store, Utensils, Wine, Pill, BarChart3, Users, Boxes, Receipt } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PriceCard } from "@/components/site/PriceCard";

export const Route = createFileRoute("/pos-systems")({
  head: () => ({
    meta: [
      { title: "Cloud POS Systems for Retail, Restaurant & Pharmacy | Abancool" },
      { name: "description", content: "Multi-tenant POS for retail, restaurants, liquor stores and pharmacies. Sales, inventory, staff roles and live reports." },
      { property: "og:title", content: "POS Systems | Abancool Technology" },
      { property: "og:description", content: "Run every counter, kitchen and stockroom from one cloud POS platform." },
    ],
  }),
  component: PosPage,
});

const verticals = [
  { icon: Store, title: "Retail POS", desc: "Barcode scanning, multi-branch stock, supplier management." },
  { icon: Utensils, title: "Restaurant POS", desc: "Table management, kitchen display screens and split bills." },
  { icon: Wine, title: "Liquor Store POS", desc: "Age verification, bottle deposit handling, bulk discounts." },
  { icon: Pill, title: "Pharmacy POS", desc: "Batch & expiry tracking, prescription logs, insurance billing." },
];

const features = [
  { icon: BarChart3, title: "Live sales reports", desc: "Track revenue, top products and staff performance in real time." },
  { icon: Boxes, title: "Inventory management", desc: "Stock levels, low-stock alerts and automatic reorder points." },
  { icon: Users, title: "Staff & roles", desc: "Cashier, supervisor and manager permissions out of the box." },
  { icon: Receipt, title: "Receipts & invoices", desc: "Print or email branded receipts. M-Pesa and card supported." },
];

const plans = [
  {
    name: "Starter",
    price: "KSh 1,500",
    description: "One outlet getting started.",
    features: ["1 Branch / Outlet", "2 Cashier accounts", "Unlimited products", "Daily sales reports", "Email support"],
  },
  {
    name: "Growth",
    price: "KSh 3,500",
    description: "For multi-cashier businesses.",
    features: ["Up to 3 Branches", "10 Staff accounts", "Inventory & suppliers", "Advanced reports", "Priority support"],
    highlighted: true,
  },
  {
    name: "Enterprise",
    price: "KSh 7,500",
    description: "Chains, franchises and large operations.",
    features: ["Unlimited branches", "Unlimited staff", "Custom integrations", "Dedicated account manager", "On-site training"],
  },
];

function PosPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="POS Systems"
        title="One cloud POS for every kind of business."
        subtitle="Retail, restaurants, pharmacies or liquor stores — Abancool POS keeps every counter in sync."
      />

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Built for your industry</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {verticals.map((v) => (
              <div key={v.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <v.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{v.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{v.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Everything you need to run a counter</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">POS subscription plans</h2>
          <p className="mt-2 text-muted-foreground">Per outlet, billed monthly. Cancel anytime.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {plans.map((p) => <PriceCard key={p.name} {...p} />)}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
