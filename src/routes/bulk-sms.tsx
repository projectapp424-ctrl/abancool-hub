import { createFileRoute, Link } from "@tanstack/react-router";
import { MessageSquare, Users, BarChart3, Tag, Upload, Send } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";

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

const features = [
  { icon: Send, title: "Send instantly", desc: "Schedule or fire campaigns to thousands of contacts in seconds." },
  { icon: Tag, title: "Branded sender IDs", desc: "Replace the number with your business name for higher trust." },
  { icon: Users, title: "Contact lists", desc: "Upload, segment and manage groups for targeted campaigns." },
  { icon: BarChart3, title: "Delivery reports", desc: "Real-time per-message status: delivered, failed, pending." },
  { icon: Upload, title: "CSV bulk upload", desc: "Import thousands of numbers from Excel or Google Sheets." },
  { icon: MessageSquare, title: "Developer API", desc: "Trigger transactional SMS from your app, POS or CRM." },
];

function SmsPage() {
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
        <div className="container-x rounded-2xl border border-border bg-card p-10 text-center shadow-[var(--shadow-soft)]">
          <h2 className="text-2xl font-bold md:text-3xl">Need bulk SMS credits?</h2>
          <p className="mt-2 text-muted-foreground">Talk to our team for volume pricing on branded SMS.</p>
          <Button className="mt-6" asChild>
            <Link to="/contact">Contact sales</Link>
          </Button>
        </div>
      </section>
    </SiteLayout>
  );
}
