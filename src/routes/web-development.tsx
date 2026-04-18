import { createFileRoute, Link } from "@tanstack/react-router";
import { Code2, Smartphone, ShoppingCart, Sparkles, Layers, GaugeCircle } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/web-development")({
  head: () => ({
    meta: [
      { title: "Custom Web Development | Abancool Technology" },
      { name: "description", content: "Custom websites, web apps, e-commerce and corporate platforms — engineered for speed and scale." },
      { property: "og:title", content: "Web Development | Abancool Technology" },
      { property: "og:description", content: "Beautifully crafted websites and web applications, built to grow with your business." },
    ],
  }),
  component: DevPage,
});

const offerings = [
  { icon: Code2, title: "Corporate Websites", desc: "Polished brand sites that convert visitors into customers." },
  { icon: ShoppingCart, title: "E-commerce Platforms", desc: "Custom online stores with M-Pesa, card and wallet checkout." },
  { icon: Smartphone, title: "Web Applications", desc: "SaaS dashboards, internal tools and customer portals built to scale." },
  { icon: Layers, title: "API & Integrations", desc: "Connect your systems — accounting, CRM, payments, logistics." },
  { icon: GaugeCircle, title: "Performance Tuning", desc: "Audit and optimise existing sites for Core Web Vitals and SEO." },
  { icon: Sparkles, title: "UI/UX Design", desc: "Research-led product design that turns ideas into elegant interfaces." },
];

const process = [
  { step: "01", title: "Discovery", desc: "We map your goals, users and technical needs in a focused workshop." },
  { step: "02", title: "Design", desc: "Wireframes and high-fidelity prototypes — approved before a line of code." },
  { step: "03", title: "Build", desc: "Modular, well-tested code shipped in weekly increments you can review." },
  { step: "04", title: "Launch & care", desc: "We monitor, iterate and support long after go-live." },
];

function DevPage() {
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Web Development"
        title="Custom websites and web apps, engineered to perform."
        subtitle="A senior team of designers and engineers who treat your product like our own."
      >
        <Button size="lg" variant="secondary" asChild>
          <Link to="/contact">Start a project</Link>
        </Button>
      </PageHero>

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">What we build</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
            {offerings.map((o) => (
              <div key={o.title} className="rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)]">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-xl bg-primary-soft text-primary">
                  <o.icon className="h-5 w-5" />
                </span>
                <h3 className="mt-4 text-base font-semibold">{o.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{o.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Our process</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
            {process.map((p) => (
              <div key={p.step} className="rounded-2xl bg-card p-6 shadow-[var(--shadow-soft)]">
                <div className="text-3xl font-bold text-primary">{p.step}</div>
                <h3 className="mt-3 text-base font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </SiteLayout>
  );
}
