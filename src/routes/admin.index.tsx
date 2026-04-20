import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Users2, Server, Receipt, ArrowUpRight, CreditCard, ShoppingBag, LifeBuoy } from "lucide-react";
import { PageHeader, StatCard, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import {
  adminGetClients, adminGetServices, adminGetInvoices, adminGetOrders, adminGetTickets,
} from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/")({
  component: AdminOverview,
});

interface Counts {
  users: number;
  servicesActive: number;
  invoicesUnpaid: number;
  unpaidTotal: number;
  ordersPending: number;
  ticketsOpen: number;
}

function AdminOverview() {
  const [c, setC] = useState<Counts | null>(null);
  const [recentInvoices, setRecentInvoices] = useState<{ id: number; invoiceNumber: string; total: number; status: string; date: string; clientName: string }[]>([]);
  const [recentOrders, setRecentOrders] = useState<{ id: number; ordernum: string; name: string; date: string; amount: number; status: string }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [clients, services, invoices, orders, tickets] = await Promise.all([
          adminGetClients({ data: {} }).catch(() => ({ clients: [] })),
          adminGetServices().catch(() => ({ services: [] })),
          adminGetInvoices({ data: {} }).catch(() => ({ invoices: [] })),
          adminGetOrders().catch(() => ({ orders: [] })),
          adminGetTickets().catch(() => ({ tickets: [] })),
        ]);
        const unpaid = invoices.invoices.filter((i) => /unpaid|overdue/i.test(i.status));
        setC({
          users: clients.clients.length,
          servicesActive: services.services.filter((s) => /active/i.test(s.status)).length,
          invoicesUnpaid: unpaid.length,
          unpaidTotal: unpaid.reduce((s, i) => s + Number(i.total), 0),
          ordersPending: orders.orders.filter((o) => /pending/i.test(o.status)).length,
          ticketsOpen: tickets.tickets.filter((t) => !/closed/i.test(t.status)).length,
        });
        setRecentInvoices(invoices.invoices.slice(0, 6));
        setRecentOrders(orders.orders.slice(0, 6));
      } catch (e) {
        console.error(e);
      }
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-8">
      <PageHeader title="Operations overview" description="At-a-glance view of the entire platform." />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Customers" value={c?.users ?? "—"} icon={<Users2 className="h-4 w-4" />} />
        <StatCard label="Active services" value={c?.servicesActive ?? "—"} icon={<Server className="h-4 w-4" />} />
        <StatCard label="Unpaid invoices" value={c?.invoicesUnpaid ?? "—"} hint={c ? formatKES(c.unpaidTotal) : "—"} icon={<Receipt className="h-4 w-4" />} />
        <StatCard label="Open tickets" value={c?.ticketsOpen ?? "—"} icon={<LifeBuoy className="h-4 w-4" />} />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <StatCard label="Pending orders" value={c?.ordersPending ?? "—"} icon={<ShoppingBag className="h-4 w-4" />} hint="Awaiting acceptance" />
        <StatCard label="Outstanding revenue" value={c ? formatKES(c.unpaidTotal) : "—"} icon={<CreditCard className="h-4 w-4" />} hint="From unpaid invoices" />
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
                  <div className="font-medium">{i.invoiceNumber}</div>
                  <div className="text-xs text-muted-foreground">{i.clientName} · {i.date ? new Date(i.date).toLocaleDateString() : ""}</div>
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
          title="Recent orders"
          actions={<Button variant="ghost" size="sm" asChild><Link to="/admin/orders">View all <ArrowUpRight className="ml-1 h-3 w-3" /></Link></Button>}
        >
          <ul className="divide-y divide-border">
            {recentOrders.map((o) => (
              <li key={o.id} className="flex items-center justify-between py-3 text-sm">
                <div>
                  <div className="font-medium">#{o.ordernum}</div>
                  <div className="text-xs text-muted-foreground">{o.name} · {o.date ? new Date(o.date).toLocaleString() : ""}</div>
                </div>
                <div className="text-right">
                  <div className="font-semibold">{formatKES(Number(o.amount))}</div>
                  <StatusBadge status={o.status} />
                </div>
              </li>
            ))}
            {recentOrders.length === 0 && <li className="py-6 text-center text-sm text-muted-foreground">No orders yet</li>}
          </ul>
        </PanelCard>
      </div>
    </div>
  );
}
