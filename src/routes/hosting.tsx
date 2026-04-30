import { createFileRoute } from "@tanstack/react-router";
import { Server, Cpu, HardDrive, Database, Mail, ShieldCheck } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { ExternalPlanCard } from "@/components/site/ExternalPlanCard";
import { SHARED_HOSTING, RESELLER_HOSTING, ABAN_HOSTING } from "@/lib/whmcs-public";

export const Route = createFileRoute("/hosting")({
  head: () => ({
    meta: [
      { title: "Web Hosting — Shared, Reseller & Aban Hosting | Abancool" },
      { name: "description", content: "Fast SSD hosting with free SSL, daily backups, cPanel and 99.9% uptime SLA. Order in seconds." },
      { property: "og:title", content: "Web Hosting | Abancool Technology" },
      { property: "og:description", content: "Reliable hosting plans engineered for speed, security and scale." },
    ],
  }),
  component: HostingPage,
});

const features = [
  { icon: Server, title: "cPanel control panel", desc: "Industry-standard panel for managing every aspect of your hosting." },
  { icon: HardDrive, title: "NVMe SSD storage", desc: "Up to 20× faster than traditional drives. Pages load before users blink." },
  { icon: Database, title: "Unlimited databases", desc: "MySQL/MariaDB databases with phpMyAdmin and remote access support." },
  { icon: Mail, title: "Branded email", desc: "Professional email addresses on your own domain with webmail and IMAP." },
  { icon: ShieldCheck, title: "Free SSL & backups", desc: "Let's Encrypt SSL on every domain plus automatic daily backups." },
  { icon: Cpu, title: "LiteSpeed & caching", desc: "LiteSpeed comes pre-tuned for WordPress and Laravel." },
];

function HostingPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Hosting"
        title="Web hosting that scales with your business."
        subtitle="From your first WordPress site to enterprise applications — pick a plan and we'll provision it automatically."
      />

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Shared Hosting</h2>
          <p className="mt-2 text-muted-foreground">Fast, reliable hosting for blogs, business sites and online stores.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {SHARED_HOSTING.map((p) => <ExternalPlanCard key={p.pid} pkg={p} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Reseller Hosting</h2>
          <p className="mt-2 text-muted-foreground">Start your own hosting brand with WHM and per-account cPanel access.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {RESELLER_HOSTING.map((p) => <ExternalPlanCard key={p.pid} pkg={p} />)}
          </div>
        </div>
      </section>

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Aban Hosting</h2>
          <p className="mt-2 text-muted-foreground">Affordable monthly NVMe hosting for individuals and small businesses.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            {ABAN_HOSTING.map((p) => <ExternalPlanCard key={p.pid} pkg={p} />)}
          </div>
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
