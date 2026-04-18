import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Server, Cpu, HardDrive, Database, Mail, ShieldCheck, Check, Loader2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { AddToCartButton } from "@/components/site/AddToCartButton";
import { supabase } from "@/integrations/supabase/client";
import { formatKES } from "@/components/dashboard/Shell";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/hosting")({
  head: () => ({
    meta: [
      { title: "Web Hosting — Shared, Reseller, VPS & Dedicated | Abancool" },
      { name: "description", content: "Fast SSD hosting with free SSL, daily backups, DirectAdmin control panel and 99.9% uptime SLA." },
      { property: "og:title", content: "Web Hosting | Abancool Technology" },
      { property: "og:description", content: "Reliable hosting plans engineered for speed, security and scale." },
    ],
  }),
  component: HostingPage,
});

interface Plan {
  id: string;
  slug: string;
  name: string;
  tagline: string | null;
  price: number;
  billing_cycle: string;
  features: string[];
  sort_order: number;
}

const features = [
  { icon: Server, title: "DirectAdmin panel", desc: "Industry-standard control panel for managing every aspect of your hosting." },
  { icon: HardDrive, title: "NVMe SSD storage", desc: "Up to 20× faster than traditional drives. Pages load before users blink." },
  { icon: Database, title: "Unlimited databases", desc: "MySQL/MariaDB databases with phpMyAdmin and remote access support." },
  { icon: Mail, title: "Branded email", desc: "Professional email addresses on your own domain with webmail and IMAP." },
  { icon: ShieldCheck, title: "Free SSL & backups", desc: "Let's Encrypt SSL on every domain plus automatic daily backups." },
  { icon: Cpu, title: "LiteSpeed & caching", desc: "LSCache and Memcached come pre-tuned for WordPress and Laravel." },
];

function HostingPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("plans")
        .select("id, slug, name, tagline, price, billing_cycle, features, sort_order")
        .eq("type", "hosting")
        .eq("is_active", true)
        .order("sort_order");
      setPlans((data as unknown as Plan[]) ?? []);
    })();
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Hosting"
        title="Web hosting that scales with your business."
        subtitle="From your first WordPress site to enterprise applications — choose a plan and we'll provision it automatically."
      />

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Shared & Business hosting</h2>
          <p className="mt-2 text-muted-foreground">Best for websites, blogs, e-commerce and agencies.</p>
          {plans === null ? (
            <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {plans.map((p, i) => <PlanCard key={p.id} plan={p} highlighted={i === 1} />)}
            </div>
          )}
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Every plan includes</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div key={f.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
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
    </SiteLayout>
  );
}

export function PlanCard({ plan, highlighted }: { plan: Plan; highlighted?: boolean }) {
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
      <h3 className="text-lg font-bold">{plan.name}</h3>
      {plan.tagline && <p className="mt-1 text-sm text-muted-foreground">{plan.tagline}</p>}
      <div className="mt-4 flex items-baseline gap-1">
        <span className="text-3xl font-bold tracking-tight">{formatKES(plan.price)}</span>
        <span className="text-sm text-muted-foreground">/{plan.billing_cycle === "one_time" ? "once" : plan.billing_cycle.replace("ly", "")}</span>
      </div>
      <ul className="mt-5 flex-1 space-y-2 text-sm">
        {plan.features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <div className="mt-6">
        <AddToCartButton planId={plan.id} variant={highlighted ? "default" : "outline"} />
      </div>
    </div>
  );
}
