import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { getMyServices, type ClientService } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/pos")({
  component: PosPage,
});

function PosPage() {
  const [items, setItems] = useState<ClientService[] | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getMyServices().catch(() => ({ services: [] }));
      setItems(r.services.filter((s) => s.category === "pos"));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="POS Systems"
        description="Manage your POS subscriptions across retail, restaurant, pharmacy and liquor."
        actions={<Button asChild><Link to="/pos-systems"><Store className="mr-1 h-4 w-4" />Add subscription</Link></Button>}
      />

      <PanelCard title="Active subscriptions" description={items ? `${items.length} subscription(s)` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<Store className="h-5 w-5" />}
            title="No POS subscriptions"
            description="Subscribe to Abancool POS to manage your retail, restaurant, pharmacy or liquor business."
            action={<Button asChild><Link to="/pos-systems">View POS plans</Link></Button>}
          />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {items.map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs capitalize text-muted-foreground">
                    {s.billingCycle} · {formatKES(Number(s.amount))} ·{" "}
                    {s.nextDueDate ? `renews ${new Date(s.nextDueDate).toLocaleDateString()}` : "no renewal"}
                  </div>
                </div>
                <StatusBadge status={s.status} />
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
