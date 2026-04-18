import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Store } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, formatKES } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/dashboard/pos")({
  component: PosPage,
});

interface Sub {
  id: string; name: string; status: string; billing_cycle: string;
  price: number; next_renewal_at: string | null;
}

function PosPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Sub[] | null>(null);

  useEffect(() => {
    if (!user) return;
    void (async () => {
      const { data } = await supabase
        .from("services").select("id, name, status, billing_cycle, price, next_renewal_at")
        .eq("user_id", user.id).eq("type", "pos").order("created_at", { ascending: false });
      setItems((data as Sub[]) ?? []);
    })();
  }, [user]);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="POS Systems"
        description="Manage your POS subscriptions across retail, restaurant, pharmacy and liquor."
        actions={<Button asChild><Link to="/pos-systems"><Store className="mr-1 h-4 w-4" />Add subscription</Link></Button>}
      />

      <PanelCard title="Active subscriptions" description={items ? `${items.length} subscription(s)` : "Loading..."}>
        {items && items.length === 0 ? (
          <EmptyState
            icon={<Store className="h-5 w-5" />}
            title="No POS subscriptions"
            description="Subscribe to Abancool POS to manage your retail, restaurant, pharmacy or liquor business."
            action={<Button asChild><Link to="/pos-systems">View POS plans</Link></Button>}
          />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(items ?? []).map((s) => (
              <li key={s.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{s.name}</div>
                  <div className="text-xs capitalize text-muted-foreground">
                    {s.billing_cycle.replace("_", " ")} · {formatKES(Number(s.price))} ·{" "}
                    {s.next_renewal_at ? `renews ${new Date(s.next_renewal_at).toLocaleDateString()}` : "no renewal"}
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
