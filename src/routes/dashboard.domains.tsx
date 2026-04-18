import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/domains")({
  component: DomainsPage,
});

interface Domain {
  id: string; name: string; domain_name: string | null; status: string;
  next_renewal_at: string | null; price: number; created_at: string;
}

function DomainsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Domain[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("services")
        .select("id, name, domain_name, status, next_renewal_at, price, created_at")
        .eq("user_id", user.id)
        .eq("type", "domain")
        .order("created_at", { ascending: false });
      setItems((data as Domain[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Domains"
        description="Manage all your domain names registered with Abancool."
        actions={<Button asChild><Link to="/domains"><Globe2 className="mr-1 h-4 w-4" />Register new</Link></Button>}
      />

      <PanelCard title="Registered domains" description={items ? `${items.length} domain(s)` : "Loading..."}>
        {items && items.length === 0 ? (
          <EmptyState
            icon={<Globe2 className="h-5 w-5" />}
            title="No domains registered"
            description="Find and register your first domain — .com, .co.ke, .africa and 200+ TLDs available."
            action={<Button asChild><Link to="/domains">Search domains</Link></Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Domain</th>
                  <th className="py-3 pr-4 font-medium">Renewal price</th>
                  <th className="py-3 pr-4 font-medium">Renews</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {(items ?? []).map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 pr-4 font-medium">{d.domain_name ?? d.name}</td>
                    <td className="py-3 pr-4">{formatKES(Number(d.price))}</td>
                    <td className="py-3 pr-4">{d.next_renewal_at ? new Date(d.next_renewal_at).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4"><StatusBadge status={d.status} /></td>
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
