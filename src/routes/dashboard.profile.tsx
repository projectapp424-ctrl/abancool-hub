import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard } from "@/components/dashboard/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/profile")({
  component: ProfilePage,
});

function ProfilePage() {
  const { user, profile, refreshProfile, roles } = useAuth();
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({
    first_name: "", last_name: "", phone: "", company: "", country: "",
  });

  useEffect(() => {
    if (profile) {
      setForm({
        first_name: profile.first_name ?? "",
        last_name: profile.last_name ?? "",
        phone: profile.phone ?? "",
        company: profile.company ?? "",
        country: profile.country ?? "",
      });
    }
  }, [profile]);

  async function onSave(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    setBusy(true);
    const { error } = await supabase.from("profiles").update(form).eq("id", user.id);
    setBusy(false);
    if (error) toast.error(error.message);
    else { toast.success("Profile updated."); void refreshProfile(); }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <PageHeader title="Profile" description="Manage your account information and preferences." />

      <PanelCard title="Account">
        <dl className="grid gap-4 text-sm sm:grid-cols-2">
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Email</dt>
            <dd className="mt-1 font-medium">{user?.email}</dd>
          </div>
          <div>
            <dt className="text-xs uppercase text-muted-foreground">Roles</dt>
            <dd className="mt-1 flex flex-wrap gap-1">
              {roles.length === 0 && <span className="text-muted-foreground">—</span>}
              {roles.map((r) => (
                <span key={r} className="rounded-full bg-primary-soft px-2 py-0.5 text-xs font-medium capitalize text-primary">
                  {r.replace("_", " ")}
                </span>
              ))}
            </dd>
          </div>
        </dl>
      </PanelCard>

      <PanelCard title="Personal details">
        <form onSubmit={onSave} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="first_name">First name</Label>
            <Input id="first_name" maxLength={50} value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="last_name">Last name</Label>
            <Input id="last_name" maxLength={50} value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" maxLength={30} value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="country">Country</Label>
            <Input id="country" maxLength={60} value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="company">Company</Label>
            <Input id="company" maxLength={100} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
          </div>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={busy}>{busy ? "Saving..." : "Save changes"}</Button>
          </div>
        </form>
      </PanelCard>
    </div>
  );
}
