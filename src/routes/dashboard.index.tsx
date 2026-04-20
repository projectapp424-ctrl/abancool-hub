import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Receipt, Wallet, LifeBuoy, ArrowUpRight, Server, Globe2, Plus, MessageSquare } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { Button } from "@/components/ui/button";
import { getMyServices, getMyInvoices, getMyTickets } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/")({
  component: OverviewPage,
});

interface Stats {
  servicesActive: number;
  invoicesUnpaid: number;
  walletBalance: number;
  smsCredits: number;
  ticketsOpen: number;
  recentInvoices: { id: number; invoiceNumber: string; total: number; status: string; date: string }[];
  recentServices: { id: number; name: string; category: string; status: string }[];
}

function OverviewPage() {
  const { user, profile } = useAuth();
  const [s, setS] = useState<Stats | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      try {
        const [services, invoices, tickets, wal, sms] = await Promise.all([
          getMyServices().catch(() => ({ services: [] })),
          getMyInvoices().catch(() => ({ invoices: [] })),
          getMyTickets().catch(() => ({ tickets: [] })),
          supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
          supabase.from("sms_credits").select("balance").eq("user_id", user.id).maybeSingle(),
        ]);
        setS({
          servicesActive: services.services.filter((x) => /active/i.test(x.status)).length,
          invoicesUnpaid: invoices.invoices.filter((i) => /unpaid|overdue/i.test(i.status)).length,
          walletBalance: Number(wal.data?.balance ?? 0),
          smsCredits: Number(sms.data?.balance ?? 0),
          ticketsOpen: tickets.tickets.filter((t) => !/closed/i.test(t.status)).length,
          recentInvoices: invoices.invoices.slice(0, 5),
          recentServices: services.services.slice(0, 5).map((x) => ({
            id: x.id,
            name: x.name,
            category: x.category,
            status: x.status,
          })),
        });
      } catch (e) {
        console.error(e);
        setS({ servicesActive: 0, invoicesUnpaid: 0, walletBalance: 0, smsCredits: 0, ticketsOpen: 0, recentInvoices: [], recentServices: [] });
      }
    })();
  }, [user]);

  const greeting = profile?.first_name ? `Welcome back, ${profile.first_name}` : "Welcome back";

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader title={greeting} description="Here's what's happening with your account today." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Active services" value={s?.servicesActive ?? "—"} icon={<Boxes className="h-4 w-4" />} hint="Hosting, domains & more" />
        <StatCard label="Unpaid invoices" value={s?.invoicesUnpaid ?? "—"} icon={<Receipt className="h-4 w-4" />} hint="Pay to keep services active" />
        <StatCard label="Wallet balance" value={s ? formatKES(s.walletBalance) : "—"} icon={<Wallet className="h-4 w-4" />} hint="Available store credit" />
        <StatCard label="SMS credits" value={s?.smsCredits.toLocaleString() ?? "—"} icon={<MessageSquare className="h-4 w-4" />} hint="Bulk SMS balance" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard
          title="Recent invoices"
          description="Your latest billing activity"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/billing">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          }
        >
          {s && s.recentInvoices.length === 0 ? (
            <EmptyState icon={<Receipt className="h-5 w-5" />} title="No invoices yet" description="Invoices will appear here once you order a service." />
          ) : (
            <ul className="divide-y divide-border">
              {(s?.recentInvoices ?? []).map((i) => (
                <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{i.invoiceNumber}</div>
                    <div className="text-xs text-muted-foreground">{i.date ? new Date(i.date).toLocaleDateString() : ""}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatKES(Number(i.total))}</div>
                    <StatusBadge status={i.status} />
                  </div>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Your services"
          description="Hosting, domains and subscriptions"
          actions={
            <Button variant="ghost" size="sm" asChild>
              <Link to="/dashboard/services">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link>
            </Button>
          }
        >
          {s && s.recentServices.length === 0 ? (
            <EmptyState
              icon={<Boxes className="h-5 w-5" />}
              title="No services yet"
              description="Order hosting or register a domain to get started."
              action={
                <div className="flex gap-2">
                  <Button size="sm" asChild><Link to="/hosting"><Server className="mr-1 h-4 w-4" />Hosting</Link></Button>
                  <Button size="sm" variant="outline" asChild><Link to="/domains"><Globe2 className="mr-1 h-4 w-4" />Domain</Link></Button>
                </div>
              }
            />
          ) : (
            <ul className="divide-y divide-border">
              {(s?.recentServices ?? []).map((svc) => (
                <li key={svc.id} className="flex items-center justify-between py-3 text-sm">
                  <div>
                    <div className="font-medium">{svc.name}</div>
                    <div className="text-xs uppercase text-muted-foreground">{svc.category.replace("_", " ")}</div>
                  </div>
                  <StatusBadge status={svc.status} />
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>

      <PanelCard title="Quick actions" description="Things you can do right now">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <QuickAction to="/hosting" icon={<Server className="h-4 w-4" />} label="Order hosting" />
          <QuickAction to="/domains" icon={<Globe2 className="h-4 w-4" />} label="Register domain" />
          <QuickAction to="/dashboard/wallet" icon={<Wallet className="h-4 w-4" />} label="Top up wallet" />
          <QuickAction to="/dashboard/tickets" icon={<Plus className="h-4 w-4" />} label="Open ticket" />
        </div>
      </PanelCard>
    </div>
  );
}

function QuickAction({ to, icon, label }: { to: "/hosting" | "/domains" | "/dashboard/wallet" | "/dashboard/tickets"; icon: React.ReactNode; label: string }) {
  return (
    <Link
      to={to}
      className="group flex items-center justify-between rounded-xl border border-border bg-secondary/40 px-4 py-3 text-sm font-medium transition hover:border-primary/40 hover:bg-secondary"
    >
      <span className="flex items-center gap-2 text-foreground">
        <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">{icon}</span>
        {label}
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-foreground" />
    </Link>
  );
}

/**
 * Generic status pill — handles the freeform statuses returned by the billing
 * platform (Active, Pending, Suspended, Unpaid, Paid, Open, Answered, etc.) plus
 * our local lowercase ones.
 */
export function StatusBadge({ status }: { status: string }) {
  const k = (status || "").toLowerCase().replace(/\s+/g, "-");
  const map: Record<string, string> = {
    active: "bg-emerald-50 text-emerald-700",
    paid: "bg-emerald-50 text-emerald-700",
    completed: "bg-emerald-50 text-emerald-700",
    pending: "bg-amber-50 text-amber-700",
    unpaid: "bg-amber-50 text-amber-700",
    overdue: "bg-red-50 text-red-700",
    suspended: "bg-red-50 text-red-700",
    terminated: "bg-zinc-100 text-zinc-600",
    cancelled: "bg-zinc-100 text-zinc-600",
    expired: "bg-zinc-100 text-zinc-600",
    refunded: "bg-zinc-100 text-zinc-600",
    fraud: "bg-red-50 text-red-700",
    open: "bg-blue-50 text-blue-700",
    answered: "bg-blue-50 text-blue-700",
    "customer-reply": "bg-amber-50 text-amber-700",
    "in-progress": "bg-blue-50 text-blue-700",
    closed: "bg-zinc-100 text-zinc-600",
    draft: "bg-zinc-100 text-zinc-600",
  };
  return (
    <span className={"inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize " + (map[k] ?? "bg-zinc-100 text-zinc-600")}>
      {status}
    </span>
  );
}
