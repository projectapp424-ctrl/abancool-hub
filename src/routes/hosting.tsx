import { createFileRoute } from "@tanstack/react-router";
import { Server, Cpu, HardDrive, Database, Mail, ShieldCheck } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PriceCard } from "@/components/site/PriceCard";

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

const plans = [
  {
    name: "Shared Starter",
    price: "KSh 299",
    description: "Perfect for personal sites and small landing pages.",
    features: ["1 Website", "10 GB SSD Storage", "Unmetered Bandwidth", "5 Email Accounts", "Free SSL Certificate", "DirectAdmin Panel"],
  },
  {
    name: "Business Pro",
    price: "KSh 899",
    description: "For growing businesses that need real performance.",
    features: ["Unlimited Websites", "100 GB NVMe Storage", "Unmetered Bandwidth", "Unlimited Emails", "Free SSL + Daily Backups", "Free Domain (1 year)"],
    highlighted: true,
  },
  {
    name: "Reseller",
    price: "KSh 2,499",
    description: "Sell hosting to your own clients with full WHM access.",
    features: ["50 cPanel Accounts", "200 GB NVMe Storage", "White-label DNS", "Free Migrations", "Priority Support", "Account Management API"],
  },
];

const vps = [
  {
    name: "VPS Cloud 1",
    price: "KSh 2,200",
    description: "Dedicated resources for production workloads.",
    features: ["2 vCPU Cores", "4 GB RAM", "60 GB NVMe", "2 TB Bandwidth", "Full Root Access", "Snapshot Backups"],
  },
  {
    name: "VPS Cloud 2",
    price: "KSh 4,400",
    description: "Power for growing applications and APIs.",
    features: ["4 vCPU Cores", "8 GB RAM", "120 GB NVMe", "4 TB Bandwidth", "Full Root Access", "Snapshot Backups"],
    highlighted: true,
  },
  {
    name: "VPS Cloud 3",
    price: "KSh 8,800",
    description: "Heavy workloads, high traffic and large databases.",
    features: ["8 vCPU Cores", "16 GB RAM", "240 GB NVMe", "8 TB Bandwidth", "Full Root Access", "Snapshot Backups"],
  },
];

const features = [
  { icon: Server, title: "DirectAdmin panel", desc: "Industry-standard control panel for managing every aspect of your hosting." },
  { icon: HardDrive, title: "NVMe SSD storage", desc: "Up to 20× faster than traditional drives. Pages load before users blink." },
  { icon: Database, title: "Unlimited databases", desc: "MySQL/MariaDB databases with phpMyAdmin and remote access support." },
  { icon: Mail, title: "Branded email", desc: "Professional email addresses on your own domain with webmail and IMAP." },
  { icon: ShieldCheck, title: "Free SSL & backups", desc: "Let's Encrypt SSL on every domain plus automatic daily backups." },
  { icon: Cpu, title: "LiteSpeed & caching", desc: "LSCache and Memcached come pre-tuned for WordPress and Laravel." },
];

function HostingPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Hosting"
        title="Web hosting that scales with your business."
        subtitle="From your first WordPress site to enterprise applications — choose a plan and we'll provision it automatically."
      />

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Shared & Reseller hosting</h2>
          <p className="mt-2 text-muted-foreground">Best for websites, blogs, e-commerce and agencies.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {plans.map((p) => <PriceCard key={p.name} {...p} />)}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">VPS Cloud hosting</h2>
          <p className="mt-2 text-muted-foreground">Dedicated resources, full root access, and zero noisy neighbours.</p>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {vps.map((p) => <PriceCard key={p.name} {...p} />)}
          </div>
        </div>
      </section>

      <section className="py-20">
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
