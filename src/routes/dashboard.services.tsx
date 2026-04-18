import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Boxes, Server, Globe2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/services")({
  component: ServicesPage,
});

interface Service {
  id: string;
  name: string;
  type: string;
  domain_name: string | null;
  status: string;
  billing_cycle: string;
  price: number;
  currency: string;
  next_renewal_at: string | null;
  created_at: string;
}

function ServicesPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Service[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, type, domain_name, status, billing_cycle, price, currency, next_renewal_at, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as Service[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="My Services"
        description="Hosting accounts, domains, POS subscriptions and more."
        actions={
          <>
            <Button variant="outline" asChild><Link to="/hosting"><Server className="mr-1 h-4 w-4" />Order hosting</Link></Button>
            <Button asChild><Link to="/domains"><Globe2 className="mr-1 h-4 w-4" />Register domain</Link></Button>
          </>
        }
      />

      <PanelCard title="All services" description={items ? `${items.length} total` : "Loading..."}>
        {items && items.length === 0 ? (
          <EmptyState
            icon={<Boxes className="h-5 w-5" />}
            title="No services yet"
            description="Once you place an order, your hosting accounts, domains and subscriptions will appear here."
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
                {(items ?? []).map((s) => (
                  <tr key={s.id}>
                    <td className="py-3 pr-4">
                      <div className="font-medium">{s.name}</div>
                      {s.domain_name && <div className="text-xs text-muted-foreground">{s.domain_name}</div>}
                    </td>
                    <td className="py-3 pr-4 capitalize">{s.type.replace("_", " ")}</td>
                    <td className="py-3 pr-4 capitalize">{s.billing_cycle.replace("_", " ")}</td>
                    <td className="py-3 pr-4 font-medium">{formatKES(Number(s.price))}</td>
                    <td className="py-3 pr-4">{s.next_renewal_at ? new Date(s.next_renewal_at).toLocaleDateString() : "—"}</td>
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
