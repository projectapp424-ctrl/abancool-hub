import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Server, ExternalLink } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/hosting")({
  component: HostingPage,
});

interface Hosting {
  id: string; name: string; domain_name: string | null; status: string;
  billing_cycle: string; price: number; next_renewal_at: string | null;
}

function HostingPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Hosting[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, domain_name, status, billing_cycle, price, next_renewal_at")
        .eq("user_id", user.id)
        .in("type", ["hosting", "vps", "reseller_hosting"])
        .order("created_at", { ascending: false });
      setItems((data as Hosting[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Hosting"
        description="Manage your hosting accounts, VPS and reseller plans."
        actions={<Button asChild><Link to="/hosting"><Server className="mr-1 h-4 w-4" />Order hosting</Link></Button>}
      />

      {items && items.length === 0 ? (
        <PanelCard title="Your hosting accounts">
          <EmptyState
            icon={<Server className="h-5 w-5" />}
            title="No hosting accounts yet"
            description="Order a hosting plan and we'll provision your DirectAdmin account automatically."
            action={<Button asChild><Link to="/hosting">View plans</Link></Button>}
          />
        </PanelCard>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {(items ?? []).map((h) => (
            <div key={h.id} className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-base font-semibold">{h.name}</h3>
                  {h.domain_name && <p className="mt-0.5 text-sm text-muted-foreground">{h.domain_name}</p>}
                </div>
                <StatusBadge status={h.status} />
              </div>
              <dl className="mt-4 grid grid-cols-2 gap-3 text-xs">
                <div>
                  <dt className="text-muted-foreground">Cycle</dt>
                  <dd className="mt-0.5 font-medium capitalize">{h.billing_cycle.replace("_", " ")}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Price</dt>
                  <dd className="mt-0.5 font-medium">{formatKES(Number(h.price))}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-muted-foreground">Renews</dt>
                  <dd className="mt-0.5 font-medium">{h.next_renewal_at ? new Date(h.next_renewal_at).toLocaleDateString() : "—"}</dd>
                </div>
              </dl>
              <div className="mt-5 flex gap-2">
                <Button size="sm" variant="outline" disabled className="flex-1">
                  Open DirectAdmin <ExternalLink className="ml-1 h-3 w-3" />
                </Button>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">DirectAdmin SSO will be available once provisioning is enabled.</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
