import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users2, Server, Receipt, Workflow, ArrowUpRight, AlertTriangle, CreditCard } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, StatCard, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

interface Counts {
  users: number;
  servicesActive: number;
  invoicesUnpaid: number;
  unpaidTotal: number;
  paidThisMonth: number;
  jobsQueued: number;
  jobsFailed: number;
}

function AdminOverview() {
  const [c, setC] = useState<Counts | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<{ id: string; invoice_number: string; total: number; status: string; created_at: string; user_id: string }[]>([]);
  const [recentJobs, setRecentJobs] = useState<{ id: string; provider: string; status: string; created_at: string; service_id: string | null }[]>([]);

  useEffect(() => {
    void (async () => {
      const startOfMonth = new Date(); startOfMonth.setDate(1); startOfMonth.setHours(0,0,0,0);
      const [users, svcs, unpaid, unpaidSum, paid, qJobs, fJobs, recInv, recJob] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }),
        supabase.from("services").select("id", { count: "exact", head: true }).eq("status", "active"),
        supabase.from("invoices").select("id", { count: "exact", head: true }).in("status", ["unpaid","overdue"]),
        supabase.from("invoices").select("total").in("status", ["unpaid","overdue"]),
        supabase.from("invoices").select("total").eq("status", "paid").gte("paid_at", startOfMonth.toISOString()),
        supabase.from("provisioning_jobs").select("id", { count: "exact", head: true }).eq("status", "queued"),
        supabase.from("provisioning_jobs").select("id", { count: "exact", head: true }).eq("status", "failed"),
        supabase.from("invoices").select("id, invoice_number, total, status, created_at, user_id").order("created_at", { ascending: false }).limit(6),
        supabase.from("provisioning_jobs").select("id, provider, status, created_at, service_id").order("created_at", { ascending: false }).limit(6),
      ]);
      setC({
        users: users.count ?? 0,
        servicesActive: svcs.count ?? 0,
        invoicesUnpaid: unpaid.count ?? 0,
        unpaidTotal: (unpaidSum.data ?? []).reduce((s, r) => s + Number(r.total), 0),
        paidThisMonth: (paid.data ?? []).reduce((s, r) => s + Number(r.total), 0),
        jobsQueued: qJobs.count ?? 0,
        jobsFailed: fJobs.count ?? 0,
      });
      setRecentInvoices(recInv.data ?? []);
      setRecentJobs(recJob.data ?? []);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader title="Operations overview" description="At-a-glance view of the entire platform." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={c?.users ?? "—"} icon={<Users2 className="h-4 w-4" />} />
        <StatCard label="Active services" value={c?.servicesActive ?? "—"} icon={<Server className="h-4 w-4" />} />
        <StatCard label="Unpaid invoices" value={c?.invoicesUnpaid ?? "—"} hint={c ? formatKES(c.unpaidTotal) : "—"} icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Revenue this month" value={c ? formatKES(c.paidThisMonth) : "—"} icon={<CreditCard className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Provisioning queue" value={c?.jobsQueued ?? "—"} icon={<Workflow className="h-4 w-4" />} hint="Jobs waiting to run" />
        <StatCard label="Failed jobs" value={c?.jobsFailed ?? "—"} icon={<AlertTriangle className="h-4 w-4" />} hint="Need staff attention" />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <PanelCard
          title="Recent invoices"
          actions={<Button variant="ghost" size="sm" asChild><Link to="/admin/invoices">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>}
        >
          <ul className="divide-y divide-border">
            {recentInvoices.map((i) => (
              <li key={i.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">{i.invoice_number}</div>
                  <div className="text-xs text-muted-foreground">{new Date(i.created_at).toLocaleDateString()}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatKES(Number(i.total))}</div>
                  <StatusBadge status={i.status} />
                </div>
              </li>
            ))}
            {recentInvoices.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No invoices yet</li>}
          </ul>
        </PanelCard>

        <PanelCard
          title="Recent provisioning jobs"
          actions={<Button variant="ghost" size="sm" asChild><Link to="/admin/provisioning">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>}
        >
          <ul className="divide-y divide-border">
            {recentJobs.map((j) => (
              <li key={j.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium capitalize">{j.provider.replace("_", " ")}</div>
                  <div className="text-xs text-muted-foreground">{new Date(j.created_at).toLocaleString()}</div>
                </div>
                <StatusBadge status={j.status} />
              </li>
            ))}
            {recentJobs.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No jobs yet</li>}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}
