import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { getProducts, type Product } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/plans")({
  component: AdminPlans,
});

function AdminPlans() {
  const [plans, setPlans] = useState<Product[] | null>(null);

  useEffect(() => {
    void (async () => {
      const r = await getProducts({ data: { category: "all" } }).catch(() => ({ products: [] }));
      setPlans(r.products);
    })();
  }, []);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Product catalog"
        description="Read-only view of every product visible on the marketing site. Edit them in the billing back-office."
      />

      <PanelCard title="All products" description={plans ? `${plans.length} product(s)` : "Loading..."}>
        {plans === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Product</th>
                  <th className="py-3 pr-4 font-medium">Category</th>
                  <th className="py-3 pr-4 font-medium">Group</th>
                  <th className="py-3 pr-4 font-medium text-right">Monthly</th>
                  <th className="py-3 pr-4 font-medium text-right">Annually</th>
                  <th className="py-3 pr-4 font-medium text-right">Setup</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {plans.map((p) => (
                  <tr key={p.pid}>
                    <td className="py-3 pr-4 font-medium">{p.name}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{p.category.replace("_", " ")}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{p.groupName ?? "—"}</td>
                    <td className="py-3 pr-4 text-right">{p.pricing.monthly > 0 ? formatKES(p.pricing.monthly) : "—"}</td>
                    <td className="py-3 pr-4 text-right">{p.pricing.annually > 0 ? formatKES(p.pricing.annually) : "—"}</td>
                    <td className="py-3 pr-4 text-right">{p.pricing.onetime > 0 ? formatKES(p.pricing.onetime) : "—"}</td>
                  </tr>
                ))}
                {plans.length === 0 && (
                  <tr><td colSpan={6} className="py-10 text-center text-sm text-muted-foreground">No products yet — add them in the billing back-office.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>
    </div>
  );
}
