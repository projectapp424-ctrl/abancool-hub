import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/plans")({
  component: AdminPlans,
});

interface Plan {
  id: string;
  slug: string;
  name: string;
  type: string;
  tagline: string | null;
  description: string | null;
  price: number;
  billing_cycle: string;
  currency: string;
  features: unknown;
  is_active: boolean;
  sort_order: number;
}

const empty: Partial<Plan> & { featuresText: string } = {
  slug: "", name: "", type: "hosting", tagline: "", description: "",
  price: 0, billing_cycle: "monthly", currency: "KES", is_active: true, sort_order: 0,
  featuresText: "",
};

function AdminPlans() {
  const [plans, setPlans] = useState<Plan[]>([]);
  const [editing, setEditing] = useState<(Partial<Plan> & { featuresText: string }) | null>(null);

  async function load() {
    const { data } = await supabase.from("plans").select("*").order("type").order("sort_order");
    setPlans((data as Plan[]) ?? []);
  }
  useEffect(() => { void load(); }, []);

  function startEdit(p?: Plan) {
    if (p) {
      setEditing({
        ...p,
        featuresText: Array.isArray(p.features) ? (p.features as string[]).join("\n") : "",
      });
    } else {
      setEditing({ ...empty });
    }
  }

  async function save() {
    if (!editing) return;
    if (!editing.name || !editing.slug) { toast.error("Name and slug are required"); return; }
    const featuresArr = (editing.featuresText ?? "").split("\n").map((s) => s.trim()).filter(Boolean);
    const payload = {
      slug: editing.slug, name: editing.name,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      type: editing.type as any,
      tagline: editing.tagline ?? null, description: editing.description ?? null,
      price: Number(editing.price ?? 0),
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      billing_cycle: editing.billing_cycle as any,
      currency: editing.currency ?? "KES", is_active: !!editing.is_active,
      sort_order: Number(editing.sort_order ?? 0),
      features: featuresArr,
    };
    if (editing.id) {
      const { error } = await supabase.from("plans").update(payload).eq("id", editing.id);
      if (error) { toast.error(error.message); return; }
      toast.success("Plan updated");
    } else {
      const { error } = await supabase.from("plans").insert(payload);
      if (error) { toast.error(error.message); return; }
      toast.success("Plan created");
    }
    setEditing(null);
    await load();
  }

  async function del(id: string) {
    if (!confirm("Delete this plan? This cannot be undone.")) return;
    const { error } = await supabase.from("plans").delete().eq("id", id);
    if (error) { toast.error(error.message); return; }
    toast.success("Plan deleted");
    await load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Plans catalog"
        description="What customers see on the marketing pages and during checkout."
        actions={<Button onClick={() => startEdit()}><Plus className="mr-1 h-4 w-4" /> New plan</Button>}
      />

      <PanelCard title="All plans" description={`${plans.length} plan${plans.length === 1 ? "" : "s"}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Slug</th>
                <th className="py-3 pr-4 font-medium">Cycle</th>
                <th className="py-3 pr-4 font-medium text-right">Price</th>
                <th className="py-3 pr-4 font-medium">Active</th>
                <th className="py-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {plans.map((p) => (
                <tr key={p.id}>
                  <td className="py-3 pr-4 font-medium">{p.name}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{p.type.replace("_", " ")}</td>
                  <td className="py-3 pr-4 font-mono text-xs text-muted-foreground">{p.slug}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{p.billing_cycle.replace("_", " ")}</td>
                  <td className="py-3 pr-4 text-right">{formatKES(Number(p.price))}</td>
                  <td className="py-3 pr-4">{p.is_active ? "Yes" : "No"}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => startEdit(p)}><Pencil className="h-3 w-3" /></Button>
                      <Button size="sm" variant="outline" onClick={() => void del(p.id)}><Trash2 className="h-3 w-3" /></Button>
                    </div>
                  </td>
                </tr>
              ))}
              {plans.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No plans yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Dialog open={!!editing} onOpenChange={(v) => { if (!v) setEditing(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader><DialogTitle>{editing?.id ? "Edit plan" : "New plan"}</DialogTitle></DialogHeader>
          {editing && (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Name *</Label>
                <Input value={editing.name ?? ""} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Slug *</Label>
                <Input value={editing.slug ?? ""} onChange={(e) => setEditing({ ...editing, slug: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <Label>Type</Label>
                <Select value={editing.type} onValueChange={(v) => setEditing({ ...editing, type: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="hosting">Hosting</SelectItem>
                    <SelectItem value="reseller_hosting">Reseller hosting</SelectItem>
                    <SelectItem value="vps">VPS</SelectItem>
                    <SelectItem value="domain">Domain</SelectItem>
                    <SelectItem value="pos">POS</SelectItem>
                    <SelectItem value="sms">SMS</SelectItem>
                    <SelectItem value="web_development">Web development</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Billing cycle</Label>
                <Select value={editing.billing_cycle} onValueChange={(v) => setEditing({ ...editing, billing_cycle: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Monthly</SelectItem>
                    <SelectItem value="quarterly">Quarterly</SelectItem>
                    <SelectItem value="semi_annually">Semi-annually</SelectItem>
                    <SelectItem value="annually">Annually</SelectItem>
                    <SelectItem value="one_time">One-time</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Price (KES)</Label>
                <Input type="number" value={String(editing.price ?? 0)} onChange={(e) => setEditing({ ...editing, price: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5">
                <Label>Sort order</Label>
                <Input type="number" value={String(editing.sort_order ?? 0)} onChange={(e) => setEditing({ ...editing, sort_order: Number(e.target.value) })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Tagline</Label>
                <Input value={editing.tagline ?? ""} onChange={(e) => setEditing({ ...editing, tagline: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={2} value={editing.description ?? ""} onChange={(e) => setEditing({ ...editing, description: e.target.value })} />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label>Features (one per line)</Label>
                <Textarea rows={5} value={editing.featuresText ?? ""} onChange={(e) => setEditing({ ...editing, featuresText: e.target.value })} placeholder="10GB SSD storage&#10;Free SSL&#10;…" />
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Switch checked={!!editing.is_active} onCheckedChange={(v) => setEditing({ ...editing, is_active: v })} />
                <Label>Active (visible to customers)</Label>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={() => void save()}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
