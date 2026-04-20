import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Server, Globe2, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { getMyServices, type ClientService } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/services")({
  component: ServicesPage,
});

function ServicesPage() {
  const [items, setItems] = useState<ClientService[] | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getMyServices().catch(() => ({ services: [] }));
      setItems(r.services);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="My Services"
        description="Hosting accounts, POS subscriptions and more."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/hosting"><Server className="mr-1 h-4 w-4" />Order hosting</Link></Button>
            <Button asChild><Link to="/domains"><Globe2 className="mr-1 h-4 w-4" />Register domain</Link></Button>
          </>
        }
      />

      <PanelCard title="All services" description={items ? `${items.length} total` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-5 w-5" />}
            title="No services yet"
            description="Once you place an order, your hosting accounts and subscriptions will appear here."
            action={<Button asChild><Link to="/pricing">Browse plans</Link></Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Service</th>
                  <th className="py-3 pr-4 font-medium">Type</th>
                  <th className="py-3 pr-4 font-medium">Cycle</th>
                  <th className="py-3 pr-4 font-medium">Price</th>
                  <th className="py-3 pr-4 font-medium">Renews</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{s.name}</div>
                      {s.domain && <div className="text-xs text-muted-foreground">{s.domain}</div>}
                    </td>
                    <td className="py-3 pr-4 capitalize">{s.category.replace("_", " ")}</td>
                    <td className="py-3 pr-4 capitalize">{s.billingCycle}</td>
                    <td className="py-3 pr-4 font-medium">{formatKES(Number(s.amount))}</td>
                    <td className="py-3 pr-4">{s.nextDueDate ? new Date(s.nextDueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4"><StatusBadge status={s.status} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
