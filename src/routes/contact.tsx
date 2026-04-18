import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Mail, Phone, MapPin, MessageCircle } from "lucide-react";
import { SiteLayout, PageHero } from "@/components/site/SiteLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact Us | Abancool Technology" },
      { name: "description", content: "Talk to the Abancool team about hosting, domains, POS, SMS and custom development." },
      { property: "og:title", content: "Contact | Abancool Technology" },
      { property: "og:description", content: "Get in touch with our sales and support team." },
    ],
  }),
  component: ContactPage,
});

function ContactPage() {
  const [form, setForm] = useState({ name: "", email: "", subject: "", message: "" });
  const [loading, setLoading] = useState(false);

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.email.trim() || !form.message.trim()) {
      toast.error("Please fill in your name, email and message.");
      return;
    }
    setLoading(true);
    setTimeout(() => {
      setLoading(false);
      toast.success("Thanks! Our team will reply within 1 business day.");
      setForm({ name: "", email: "", subject: "", message: "" });
    }, 700);
  }

  return (
    <SiteLayout>
      <PageHero
        eyebrow="Contact"
        title="Talk to the Abancool team."
        subtitle="Sales, support or partnerships — we usually reply within a few hours."
      />

      <section className="py-20">
        <div className="container-x grid gap-10 lg:grid-cols-3">
          <div className="lg:col-span-1">
            <h2 className="text-xl font-semibold">Reach us directly</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Prefer email or phone? Use any of the channels below.
            </p>
            <ul className="mt-6 space-y-4">
              {[
                { icon: Mail, label: "Email", value: "hello@abancool.tech" },
                { icon: Phone, label: "Phone", value: "+254 700 000 000" },
                { icon: MessageCircle, label: "WhatsApp", value: "+254 700 000 000" },
                { icon: MapPin, label: "Office", value: "Nairobi, Kenya" },
              ].map((c) => (
                <li key={c.label} className="flex items-start gap-3">
                  <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                    <c.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <div className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</div>
                    <div className="text-sm font-medium">{c.value}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <form
            onSubmit={onSubmit}
            className="lg:col-span-2 rounded-2xl border border-border bg-card p-6 shadow-[var(--shadow-soft)] md:p-8"
          >
            <div className="grid gap-5 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full name</Label>
                <Input id="name" maxLength={100} value={form.name} onChange={(e) => update("name", e.target.value)} placeholder="Jane Doe" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" maxLength={255} value={form.email} onChange={(e) => update("email", e.target.value)} placeholder="jane@company.com" />
              </div>
            </div>
            <div className="mt-5 space-y-2">
              <Label htmlFor="subject">Subject</Label>
              <Input id="subject" maxLength={150} value={form.subject} onChange={(e) => update("subject", e.target.value)} placeholder="What can we help with?" />
            </div>
            <div className="mt-5 space-y-2">
              <Label htmlFor="message">Message</Label>
              <Textarea id="message" maxLength={2000} rows={6} value={form.message} onChange={(e) => update("message", e.target.value)} placeholder="Tell us a bit about your project or question..." />
            </div>
            <Button type="submit" size="lg" className="mt-6" disabled={loading}>
              {loading ? "Sending..." : "Send message"}
            </Button>
          </form>
        </div>
      </section>
    </SiteLayout>
  );
}
