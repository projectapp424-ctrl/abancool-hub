import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Users, BarChart3, Tag, Upload, Send, Loader2 } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { PlanCard } from "@/routes/hosting";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/bulk-sms")({
  head: () => ({
    meta: [
      { title: "Bulk SMS Gateway for Businesses | Abancool Technology" },
      { name: "description", content: "Send branded bulk SMS with delivery reports, contact uploads, sender ID management and developer API." },
      { property: "og:title", content: "Bulk SMS | Abancool Technology" },
      { property: "og:description", content: "Reach every customer instantly with reliable, branded bulk SMS." },
    ],
  }),
  component: SmsPage,
});

interface Plan {
  id: string; slug: string; name: string; tagline: string | null;
  price: number; billing_cycle: string; features: string[]; sort_order: number;
}

const features = [
  { icon: Send, title: "Send instantly", desc: "Schedule or fire campaigns to thousands of contacts in seconds." },
  { icon: Tag, title: "Branded sender IDs", desc: "Replace the number with your business name for higher trust." },
  { icon: Users, title: "Contact lists", desc: "Upload, segment and manage groups for targeted campaigns." },
  { icon: BarChart3, title: "Delivery reports", desc: "Real-time per-message status: delivered, failed, pending." },
  { icon: Upload, title: "CSV bulk upload", desc: "Import thousands of numbers from Excel or Google Sheets." },
  { icon: MessageSquare, title: "Developer API", desc: "Trigger transactional SMS from your app, POS or CRM." },
];

function SmsPage() {
  const [plans, setPlans] = useState<Plan[] | null>(null);

  useEffect(() => {
    void (async () => {
      const { data } = await supabase
        .from("plans")
        .select("id, slug, name, tagline, price, billing_cycle, features, sort_order")
        .eq("type", "sms")
        .eq("is_active", true)
        .order("sort_order");
      setPlans((data as unknown as Plan[]) ?? []);
    })();
  }, []);

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Bulk SMS"
        title="Reach every customer. Instantly."
        subtitle="Branded sender IDs, real-time delivery reports and a developer API — all on one reliable SMS gateway."
      />

      <section className="py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">A complete SMS platform</h2>
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

      <section className="border-t border-border bg-secondary/40 py-20">
        <div className="container-x">
          <h2 className="text-2xl font-bold md:text-3xl">SMS credit packs</h2>
          <p className="mt-2 text-muted-foreground">Buy credits once. Use them whenever you need.</p>
          {plans === null ? (
            <div className="mt-10 flex justify-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
          ) : (
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {plans.map((p, i) => <PlanCard key={p.id} plan={p} highlighted={i === 1} />)}
            </div>
          )}
        </div>
      </section>
    </SiteLayout>
  );
}
