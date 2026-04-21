import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Search, Globe2, ArrowRightLeft, Settings2, RefreshCw, Loader2, Check, X } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useCart } from "@/lib/cart";
import { useAuth } from "@/lib/auth";
import { useNavigate } from "@tanstack/react-router";
import { formatKES } from "@/components/dashboard/Shell";
import { getProducts } from "@/lib/whmcs.functions";
import type { Product } from "@/lib/whmcs-types";
import { toast } from "sonner";

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

const fallbackTlds = [
  { tld: ".com", price: 1499, pid: 0 },
  { tld: ".co.ke", price: 1200, pid: 0 },
  { tld: ".africa", price: 2500, pid: 0 },
  { tld: ".net", price: 1800, pid: 0 },
  { tld: ".org", price: 1800, pid: 0 },
  { tld: ".io", price: 6500, pid: 0 },
  { tld: ".tech", price: 4500, pid: 0 },
  { tld: ".store", price: 3200, pid: 0 },
];

const features = [
  { icon: Globe2, title: "200+ TLDs available", desc: "From .com to .africa — find the right name for your brand." },
  { icon: ArrowRightLeft, title: "Free domain transfer", desc: "Move your domain to Abancool in a few clicks. Zero downtime." },
  { icon: Settings2, title: "Full DNS management", desc: "A, CNAME, MX, TXT, SPF and more — manage everything yourself." },
  { icon: RefreshCw, title: "Auto-renew protection", desc: "Never lose a domain to expiry. Renewals handled automatically." },
];

type TldPrice = { tld: string; price: number; pid: number };

function domainProductToTld(product: Product): TldPrice | null {
  const text = `${product.name} ${product.description}`.toLowerCase();
  const tldMatch = text.match(/\.(?:co\.ke|[a-z]{2,12})\b/);
  const price = product.pricing.annually > 0 ? product.pricing.annually : product.pricing.onetime;
  if (!tldMatch || price <= 0) return null;
  return { tld: tldMatch[0], price, pid: product.pid };
}

function DomainsPage() {
  const [q, setQ] = useState("");
  const [searched, setSearched] = useState<string | null>(null);
  const [searching, setSearching] = useState(false);
  const [domainProducts, setDomainProducts] = useState<Product[] | null>(null);
  const { add } = useCart();
  const { user } = useAuth();
  const nav = useNavigate();

  useEffect(() => {
    void (async () => {
      const r = await getProducts({ data: { category: "domain" } }).catch(() => ({ products: [] }));
      setDomainProducts(r.products);
    })();
  }, []);

  const tlds = useMemo(() => {
    const mapped = (domainProducts ?? []).map(domainProductToTld).filter((v): v is TldPrice => Boolean(v));
    return mapped.length > 0 ? mapped : fallbackTlds;
  }, [domainProducts]);

  function onSearch(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = q.trim().toLowerCase().replace(/^https?:\/\//, "").split("/")[0];
    if (!cleaned) { toast.error("Enter a domain to search"); return; }
    setSearching(true);
    setTimeout(() => {
      setSearched(cleaned);
      setSearching(false);
    }, 600);
  }

  const baseName = searched ? (searched.includes(".") ? searched.split(".")[0] : searched) : "";

  function addDomain(tld: TldPrice) {
    if (!user) {
      toast.info("Sign in to register a domain");
      void nav({ to: "/login" });
      return;
    }
    if (!tld.pid) {
      toast.info("This extension is not orderable online yet. Please contact sales.");
      return;
    }
    add({
      pid: tld.pid,
      name: `Domain ${baseName}${tld.tld}`,
      price: tld.price,
      billingCycle: "annually",
      domain: `${baseName}${tld.tld}`,
      category: "domain",
    });
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
              placeholder="yourbusiness"
              className="h-12 border-white/10 bg-white/10 pl-10 text-white placeholder:text-white/50"
            />
          </div>
          <Button type="submit" size="lg" className="h-12 px-6" disabled={searching}>
            {searching ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Search
          </Button>
        </form>
      </PageHero>

      {searched && (
        <section className="border-b border-border bg-secondary/40 py-12">
          <div className="container-x">
            <h2 className="text-xl font-bold md:text-2xl">Available extensions for &quot;{baseName}&quot;</h2>
            <p className="mt-1 text-sm text-muted-foreground">Availability is confirmed during order processing.</p>
            <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-2">
              {tlds.map((t) => {
                const fullName = `${baseName}${t.tld}`;
                const unavailable = baseName.length < 3;
                return (
                  <div key={t.tld} className="flex items-center justify-between rounded-xl border border-border bg-card p-4 shadow-[var(--shadow-soft)]">
                    <div className="flex items-center gap-3">
                      <span className={(unavailable ? "bg-destructive/10 text-destructive" : "bg-primary-soft text-primary") + " flex h-9 w-9 items-center justify-center rounded-lg"}>
                        {unavailable ? <X className="h-4 w-4" /> : <Check className="h-4 w-4" />}
                      </span>
                      <div>
                        <div className="font-semibold">{fullName}</div>
                        <div className="text-xs text-muted-foreground">{unavailable ? "Enter at least 3 characters" : `${formatKES(t.price)}/year`}</div>
                      </div>
                    </div>
                    {!unavailable && (
                      <Button size="sm" onClick={() => addDomain(t)}>
                        Add to cart
                      </Button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">Popular extensions</h2>
          <p className="mt-2 text-muted-foreground">Transparent pricing from the live catalog.</p>
          {domainProducts === null ? (
            <div className="mt-8 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {tlds.map((t) => (
                <div key={t.tld} className="flex items-center justify-between rounded-xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
                  <span className="text-lg font-semibold text-primary">{t.tld}</span>
                  <span className="text-sm font-medium text-foreground">{formatKES(t.price)}<span className="text-muted-foreground">/yr</span></span>
                </div>
              ))}
            </div>
          )}
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
