import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Globe2, Loader2 } from "lucide-react";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { getMyDomains, type ClientDomain } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/domains")({
  component: DomainsPage,
});

function DomainsPage() {
  const [items, setItems] = useState<ClientDomain[] | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getMyDomains().catch(() => ({ domains: [] }));
      setItems(r.domains);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Domains"
        description="Manage all your domain names registered with Abancool."
        actions={<Button asChild><Link to="/domains"><Globe2 className="mr-1 h-4 w-4" />Register new</Link></Button>}
      />

      <PanelCard title="Registered domains" description={items ? `${items.length} domain(s)` : "Loading..."}>
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
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
                  <th className="py-3 pr-4 font-medium">Period</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {items.map((d) => (
                  <tr key={d.id}>
                    <td className="py-3 pr-4 font-medium">{d.domainName}</td>
                    <td className="py-3 pr-4">{formatKES(Number(d.recurringAmount))}</td>
                    <td className="py-3 pr-4">{d.nextDueDate ? new Date(d.nextDueDate).toLocaleDateString() : "—"}</td>
                    <td className="py-3 pr-4">{d.registrationPeriod} yr</td>
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
