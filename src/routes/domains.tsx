import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Globe2, ArrowRightLeft, Settings2, RefreshCw } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/domains")({
  head: () => ({
    meta: [
      { title: "Domain Names — Search & Register | Abancool Technology" },
      { name: "description", content: "Search, register and transfer domains across .com, .co.ke, .africa and 200+ TLDs with free DNS management." },
      { property: "og:title", content: "Domain Names | Abancool Technology" },
      { property: "og:description", content: "Find the perfect domain for your business — register or transfer in minutes." },
    ],
  }),
  component: DomainsPage,
});

const tlds = [
  { tld: ".com", price: "KSh 1,499" },
  { tld: ".co.ke", price: "KSh 1,200" },
  { tld: ".africa", price: "KSh 2,500" },
  { tld: ".net", price: "KSh 1,800" },
  { tld: ".org", price: "KSh 1,800" },
  { tld: ".io", price: "KSh 6,500" },
  { tld: ".tech", price: "KSh 4,500" },
  { tld: ".store", price: "KSh 3,200" },
];

const features = [
  { icon: Globe2, title: "200+ TLDs available", desc: "From .com to .africa — find the right name for your brand." },
  { icon: ArrowRightLeft, title: "Free domain transfer", desc: "Move your domain to Abancool in a few clicks. Zero downtime." },
  { icon: Settings2, title: "Full DNS management", desc: "A, CNAME, MX, TXT, SPF and more — manage everything yourself." },
  { icon: RefreshCw, title: "Auto-renew protection", desc: "Never lose a domain to expiry. Renewals handled automatically." },
];

function DomainsPage() {
  const [q, setQ] = useState("");
  return (
    <SiteLayout>
      <PageHero
        eyebrow="Domains"
        title="Find a domain that defines your brand."
        subtitle="Search across hundreds of extensions and register your perfect domain in minutes."
      >
        <form
          onSubmit={(e) => e.preventDefault()}
          className="flex max-w-2xl flex-col gap-3 rounded-2xl border border-white/10 bg-white/5 p-3 backdrop-blur sm:flex-row"
        >
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-white/50" />
            <Input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="yourbusiness.com"
              className="h-12 border-white/10 bg-white/10 pl-10 text-white placeholder:text-white/50"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-6">Search</Button>
        </form>
      </PageHero>

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Popular extensions</h2>
          <p className="mt-2 text-muted-foreground">Transparent pricing. No hidden renewal hikes.</p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {tlds.map((t) => (
              <div key={t.tld} className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                <span className="text-lg font-semibold text-primary">{t.tld}</span>
                <span className="text-sm font-medium text-foreground">{t.price}<span className="text-muted-foreground">/yr</span></span>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x grid gap-8 md:grid-cols-2 lg:grid-cols-4">
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
      </section>
    </SiteLayout>
  );
}
