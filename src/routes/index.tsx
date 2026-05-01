import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Search,
  Server,
  Globe2,
  Code2,
  Store,
  MessageSquare,
  ShieldCheck,
  Zap,
  HeadphonesIcon,
  ArrowRight,
  Check,
} from "lucide-react";
import { useState } from "react";
import { SiteLayout } from "@/components/site/SiteLayout";
import { TeamSection } from "@/components/site/TeamSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import heroImg from "@/assets/hero-tech.jpg";
import { WHMCS_BASE, WHMCS_DOMAINS_URL } from "@/lib/whmcs-public";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Abancool Technology — Hosting, Domains, POS & Bulk SMS" },
      {
        name: "description",
        content:
          "Fast web hosting, domains, custom development, POS systems and bulk SMS — all from one trusted provider.",
      },
      { property: "og:title", content: "Abancool Technology" },
      { property: "og:description", content: "Everything your business needs to run online — hosting, domains, POS and SMS." },
    ],
  }),
  component: HomePage,
});

const tlds = [".com", ".co.ke", ".africa", ".net", ".org", ".io"];

function HomePage() {
  const [domain, setDomain] = useState("");
  return (
    <SiteLayout>
      {/* HERO */}
      <section className="relative overflow-hidden bg-[color:var(--brand-navy)] text-white">
        <div className="absolute inset-0 opacity-90" style={{ background: "var(--gradient-hero)" }} />
        <div className="container-x relative grid items-center gap-12 py-20 md:py-28 lg:grid-cols-2">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-white/80 backdrop-blur">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" /> 99.9% uptime guarantee
            </span>
            <h1 className="mt-5 text-4xl font-bold leading-tight md:text-5xl lg:text-6xl">
              Power your business with <span className="text-gradient">Abancool</span>
            </h1>
            <p className="mt-5 max-w-xl text-base text-white/70 md:text-lg">
              Hosting, domains, custom web development, POS systems and bulk SMS — built for
              speed, reliability and the realities of running a business in Africa.
            </p>

            {/* Domain search */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                const cleaned = domain.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
                window.location.href = cleaned
                  ? `${WHMCS_BASE}?rp=/domain/register&query=${encodeURIComponent(cleaned)}`
                  : WHMCS_DOMAINS_URL;
              }}
              className="mt-8 flex flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur sm:flex-row"
            >
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
                <Input
                  value={domain}
                  onChange={(e) => setDomain(e.target.value)}
                  placeholder="Find your perfect domain..."
                  className="h-12 border-white/10 bg-white/10 pl-10 text-white placeholder:text-white/50 focus-visible:ring-primary"
                />
              </div>
              <Button type="submit" size="lg" className="h-12 px-6">
                Search Domain
              </Button>
            </form>
            <div className="mt-4 flex flex-wrap gap-2 text-xs text-white/60">
              {tlds.map((t) => (
                <span key={t} className="rounded-md bg-white/5 px-2 py-1">
                  {t}
                </span>
              ))}
            </div>
          </div>

          <div className="relative">
            <div className="absolute -inset-4 rounded-3xl bg-primary/20 blur-2xl" />
            <img
              src={heroImg}
              alt="Cloud servers and connected services illustration"
              width={1536}
              height={1024}
              className="relative w-full rounded-2xl border border-white/10 shadow-2xl"
            />
          </div>
        </div>
      </section>

      {/* SERVICES GRID */}
      <section className="py-20">
        <div className="container-x">
          <SectionHead
            eyebrow="What we do"
            title="One platform. Every digital service you need."
            subtitle="From your first domain to a fully managed POS network — Abancool is the partner that scales with you."
          />
          <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
            {services.map((s) => (
              <ServiceCard key={s.title} {...s} />
            ))}
          </div>
        </div>
      </section>

      {/* WHY US */}
      <section className="border-y border-border bg-secondary/40 py-20">
        <div className="container-x">
          <SectionHead eyebrow="Why Abancool" title="Built for businesses that don't have time for downtime." />
          <div className="mt-12 grid gap-8 md:grid-cols-2 lg:grid-cols-4">
            {features.map((f) => (
              <div key={f.title}>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary text-primary-foreground">
                  <f.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{f.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOSTING TEASER */}
      <section className="py-20">
        <div className="container-x grid items-center gap-12 lg:grid-cols-2">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">Hosting</p>
            <h2 className="mt-3 text-3xl font-bold md:text-4xl">
              Lightning-fast hosting on enterprise infrastructure
            </h2>
            <p className="mt-4 text-muted-foreground">
              SSD storage, free SSL, daily backups and a real human on support — every plan, every
              client, no exceptions.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              {[
                "Free SSL certificates on every site",
                "One-click WordPress, Laravel & Node installs",
                "Free migration from your current host",
                "DirectAdmin control panel access",
              ].map((b) => (
                <li key={b} className="flex items-start gap-2">
                  <Check className="mt-0.5 h-4 w-4 text-primary" />
                  <span>{b}</span>
                </li>
              ))}
            </ul>
            <div className="mt-8 flex gap-3">
              <Button asChild>
                <Link to="/hosting">
                  View hosting plans <ArrowRight className="ml-1 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="outline" asChild>
                <Link to="/pricing">Compare pricing</Link>
              </Button>
            </div>
          </div>
          <div className="rounded-2xl border border-border bg-card p-8 shadow-[var(--shadow-soft)]">
            <div className="grid grid-cols-2 gap-4 text-center">
              {[
                { v: "99.9%", l: "Uptime SLA" },
                { v: "<1s", l: "Avg load time" },
                { v: "24/7", l: "Human support" },
                { v: "100+", l: "Apps in 1-click" },
              ].map((s) => (
                <div key={s.l} className="rounded-xl bg-secondary/60 p-5">
                  <div className="text-2xl font-bold text-primary">{s.v}</div>
                  <div className="mt-1 text-xs text-muted-foreground">{s.l}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* TEAM */}
      <TeamSection />

      {/* CTA */}
      <section className="pb-20 pt-20">
        <div className="container-x">
          <div className="relative overflow-hidden rounded-3xl bg-[color:var(--brand-navy)] p-10 text-white md:p-14">
            <div className="absolute inset-0 opacity-60" style={{ background: "var(--gradient-hero)" }} />
            <div className="relative flex flex-col items-start justify-between gap-6 md:flex-row md:items-center">
              <div>
                <h2 className="text-2xl font-bold md:text-3xl">Ready to launch with Abancool?</h2>
                <p className="mt-2 max-w-lg text-white/70">
                  Open an account in minutes. Pay with M-Pesa or card. Get your service activated
                  automatically.
                </p>
              </div>
              <div className="flex gap-3">
                <Button size="lg" variant="secondary" asChild>
                  <Link to="/pricing">See pricing</Link>
                </Button>
                <Button size="lg" asChild>
                  <Link to="/contact">Talk to sales</Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}

function SectionHead({
  eyebrow,
  title,
  subtitle,
}: {
  eyebrow?: string;
  title: string;
  subtitle?: string;
}) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      {eyebrow && (
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-primary">{eyebrow}</p>
      )}
      <h2 className="mt-3 text-3xl font-bold md:text-4xl">{title}</h2>
      {subtitle && <p className="mt-3 text-muted-foreground">{subtitle}</p>}
    </div>
  );
}

function ServiceCard({
  icon: Icon,
  title,
  desc,
  href,
}: {
  icon: typeof Server;
  title: string;
  desc: string;
  href: "/" | "/domains" | "/hosting" | "/web-development" | "/pos-systems" | "/bulk-sms" | "/pricing" | "/contact";
}) {
  return (
    <Link
      to={href}
      className="group rounded-2xl border border-border bg-card p-6 transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-[var(--shadow-elevated)]"
    >
      <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
        <Icon className="h-5 w-5" />
      </span>
      <h3 className="mt-5 text-base font-semibold">{title}</h3>
      <p className="mt-1.5 text-sm text-muted-foreground">{desc}</p>
      <span className="mt-4 inline-flex items-center text-sm font-medium text-primary">
        Learn more <ArrowRight className="ml-1 h-4 w-4 transition-transform group-hover:translate-x-0.5" />
      </span>
    </Link>
  );
}

const services = [
  { icon: Server, title: "Web Hosting", desc: "Shared, Reseller, VPS and Dedicated — all on fast SSD with free SSL.", href: "/hosting" as const },
  { icon: Globe2, title: "Domain Names", desc: "Search, register and transfer domains across .com, .co.ke and 200+ TLDs.", href: "/domains" as const },
  { icon: Code2, title: "Web Development", desc: "Custom websites and web apps engineered for performance and growth.", href: "/web-development" as const },
  { icon: Store, title: "POS Systems", desc: "Cloud POS for retail, restaurants, pharmacies and liquor stores.", href: "/pos-systems" as const },
  { icon: MessageSquare, title: "Bulk SMS", desc: "Reach customers instantly with branded sender IDs and delivery reports.", href: "/bulk-sms" as const },
  { icon: ShieldCheck, title: "Security & Backups", desc: "Daily backups, free SSL, DDoS protection and 24/7 monitoring.", href: "/hosting" as const },
];

const features = [
  { icon: Zap, title: "Blazing fast", desc: "NVMe SSD, LiteSpeed and a global CDN built into every plan." },
  { icon: ShieldCheck, title: "Bank-grade security", desc: "Free SSL, daily backups and proactive threat monitoring." },
  { icon: HeadphonesIcon, title: "Local support, 24/7", desc: "Real engineers — not chatbots — ready when you are." },
  { icon: Server, title: "Auto-provisioning", desc: "Pay and your service is live in minutes, not days." },
];
