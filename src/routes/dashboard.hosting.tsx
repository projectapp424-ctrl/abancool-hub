import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Server, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { getMyServices, type ClientService } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/hosting")({
  component: HostingPage,
});

function HostingPage() {
  const [items, setItems] = useState<ClientService[] | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getMyServices().catch(() => ({ services: [] }));
      setItems(r.services.filter((s) => ["hosting", "vps", "reseller_hosting"].includes(s.category)));
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Hosting"
        description="Manage your hosting accounts, VPS and reseller plans."
        actions={<Button asChild><Link to="/hosting"><Server className="mr-1 h-4 w-4" />Order hosting</Link></Button>}
      />

      {items === null ? (
        <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
      ) : items.length === 0 ? (
        <PanelCard title="Your hosting accounts">
          <EmptyState
            icon={<Server className="h-5 w-5" />}
            title="No hosting accounts yet"
            description="Order a hosting plan and we'll provision your account automatically."
            action={<Button asChild><Link to="/hosting">View plans</Link></Button>}
          />
        </PanelCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {items.map((h) => (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{h.name}</h3>
                  {h.domain && <p className="mt-0.5 text-sm text-muted-foreground">{h.domain}</p>}
                </div>
                <StatusBadge status={h.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Cycle</dt>
                  <dd className="mt-0.5 font-medium capitalize">{h.billingCycle}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="mt-0.5 font-medium">{formatKES(Number(h.amount))}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Username</dt>
                  <dd className="mt-0.5 font-medium font-mono">{h.username || "—"}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Renews</dt>
                  <dd className="mt-0.5 font-medium">{h.nextDueDate ? new Date(h.nextDueDate).toLocaleDateString() : "—"}</dd>
                </div>
              </dl>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
