import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Server, Cpu, HardDrive, Database, Mail, ShieldCheck, Loader2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PlanCard } from "@/components/site/PlanCard";
import { getProducts } from "@/lib/whmcs.functions";
import type { Product } from "@/lib/whmcs-types";

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

const features = [
  { icon: Server, title: "DirectAdmin panel", desc: "Industry-standard control panel for managing every aspect of your hosting." },
  { icon: HardDrive, title: "NVMe SSD storage", desc: "Up to 20× faster than traditional drives. Pages load before users blink." },
  { icon: Database, title: "Unlimited databases", desc: "MySQL/MariaDB databases with phpMyAdmin and remote access support." },
  { icon: Mail, title: "Branded email", desc: "Professional email addresses on your own domain with webmail and IMAP." },
  { icon: ShieldCheck, title: "Free SSL & backups", desc: "Let's Encrypt SSL on every domain plus automatic daily backups." },
  { icon: Cpu, title: "LiteSpeed & caching", desc: "LSCache and Memcached come pre-tuned for WordPress and Laravel." },
];

function HostingPage() {
  const [plans, setPlans] = useState<Product[] | null>(null);

  useEffect(() => {
    void (async () => {
      const [hosting, reseller, vps] = await Promise.all([
        getProducts({ data: { category: "hosting" } }).catch(() => ({ products: [] })),
        getProducts({ data: { category: "reseller_hosting" } }).catch(() => ({ products: [] })),
        getProducts({ data: { category: "vps" } }).catch(() => ({ products: [] })),
      ]);
      setPlans([...hosting.products, ...reseller.products, ...vps.products]);
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
          <h2 className="text-2xl font-bold md:text-3xl">Hosting plans</h2>
          <p className="mt-2 text-muted-foreground">Live packages from our billing catalog.</p>
          {plans === null ? (
            <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : plans.length === 0 ? (
            <p className="mt-8 rounded-2xl border border-border bg-card p-6 text-sm text-muted-foreground">No hosting packages are currently available.</p>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {plans.map((p, i) => <PlanCard key={p.pid} product={p} highlighted={i === 1} />)}
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
