import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Search, Globe2, ArrowRightLeft, Settings2, RefreshCw, ExternalLink } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { WHMCS_DOMAINS_URL, WHMCS_DOMAIN_TRANSFER_URL, WHMCS_BASE } from "@/lib/whmcs-public";

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

const popularTlds = [
  { tld: ".com", price: "KES 1,499/yr" },
  { tld: ".co.ke", price: "KES 1,200/yr" },
  { tld: ".africa", price: "KES 2,500/yr" },
  { tld: ".net", price: "KES 1,800/yr" },
  { tld: ".org", price: "KES 1,800/yr" },
  { tld: ".io", price: "KES 6,500/yr" },
  { tld: ".tech", price: "KES 4,500/yr" },
  { tld: ".store", price: "KES 3,200/yr" },
];

const features = [
  { icon: Globe2, title: "200+ TLDs available", desc: "From .com to .africa — find the right name for your brand." },
  { icon: ArrowRightLeft, title: "Free domain transfer", desc: "Move your domain to Abancool in a few clicks. Zero downtime." },
  { icon: Settings2, title: "Full DNS management", desc: "A, CNAME, MX, TXT, SPF and more — manage everything yourself." },
  { icon: RefreshCw, title: "Auto-renew protection", desc: "Never lose a domain to expiry. Renewals handled automatically." },
];

function DomainsPage() {
  const [q, setQ] = useState("");

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = q.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    const target = cleaned
      ? `${WHMCS_BASE}?rp=/domain/register&query=${encodeURIComponent(cleaned)}`
      : WHMCS_DOMAINS_URL;
    window.location.href = target;
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Domains"
        title="Find a domain that defines your brand."
        subtitle="Search across hundreds of extensions and register your perfect domain in minutes."
      >
        <form
          onSubmit={onSearch}
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
          <Button type="submit" size="lg" className="h-12 px-6">
            Search <ExternalLink className="ml-2 h-4 w-4" />
          </Button>
        </form>
      </PageHero>

      <section className="py-20">
        <div className="container-x">
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h2 className="text-2xl font-bold md:text-3xl">Popular extensions</h2>
              <p className="mt-2 text-muted-foreground">Indicative pricing — confirm during checkout.</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" asChild>
                <a href={WHMCS_DOMAIN_TRANSFER_URL}>
                  Transfer a domain <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
              <Button asChild>
                <a href={WHMCS_DOMAINS_URL}>
                  Register new domain <ExternalLink className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {popularTlds.map((t) => (
              <a
                key={t.tld}
                href={WHMCS_DOMAINS_URL}
                className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)] transition hover:border-primary"
              >
                <span className="text-lg font-semibold text-primary">{t.tld}</span>
                <span className="text-sm font-medium text-foreground">{t.price}</span>
              </a>
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
