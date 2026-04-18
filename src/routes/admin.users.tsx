import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Wallet, ShieldCheck, MessageSquare } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PanelCard, formatKES } from "@/components/dashboard/Shell";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/users")({
  component: AdminUsers,
});

interface Row {
  id: string;
  first_name: string | null;
  last_name: string | null;
  company: string | null;
  country: string | null;
  phone: string | null;
  created_at: string;
  email?: string | null;
  role?: string | null;
  wallet?: number;
  sms?: number;
}

type Action = "wallet" | "role" | "sms";

function AdminUsers() {
  const { hasRole } = useAuth();
  const [rows, setRows] = useState<Row[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Row | null>(null);
  const [action, setAction] = useState<Action | null>(null);
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [role, setRole] = useState<string>("client");

  async function load() {
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, company, country, phone, created_at")
      .order("created_at", { ascending: false })
      .limit(200);
    if (!profiles) return;

    const ids = profiles.map((p) => p.id);
    const [rolesRes, walletsRes, smsRes] = await Promise.all([
      supabase.from("user_roles").select("user_id, role").in("user_id", ids),
      supabase.from("wallet_balances").select("user_id, balance").in("user_id", ids),
      supabase.from("sms_credits").select("user_id, balance").in("user_id", ids),
    ]);
    const roleMap = new Map<string, string>();
    for (const r of rolesRes.data ?? []) {
      // Take the highest privilege if multiple
      const cur = roleMap.get(r.user_id);
      const prio: Record<string, number> = { client: 1, reseller: 2, admin: 3, super_admin: 4 };
      if (!cur || (prio[r.role] ?? 0) > (prio[cur] ?? 0)) roleMap.set(r.user_id, r.role);
    }
    const walletMap = new Map<string, number>();
    for (const w of walletsRes.data ?? []) walletMap.set(w.user_id, Number(w.balance));
    const smsMap = new Map<string, number>();
    for (const s of smsRes.data ?? []) smsMap.set(s.user_id, Number(s.balance));

    setRows(
      profiles.map((p) => ({
        ...p,
        role: roleMap.get(p.id) ?? "client",
        wallet: walletMap.get(p.id) ?? 0,
        sms: smsMap.get(p.id) ?? 0,
      })),
    );
  }

  useEffect(() => { void load(); }, []);

  const filtered = rows.filter((r) => {
    if (!q) return true;
    const s = q.toLowerCase();
    return [r.first_name, r.last_name, r.company, r.country, r.phone, r.role]
      .filter(Boolean)
      .some((v) => String(v).toLowerCase().includes(s));
  });

  function open(u: Row, a: Action) {
    setActive(u);
    setAction(a);
    setAmount("");
    setNote("");
    setRole(u.role ?? "client");
  }

  async function submit() {
    if (!active) return;
    try {
      if (action === "wallet") {
        const v = Number(amount);
        if (!Number.isFinite(v) || v === 0) throw new Error("Enter a non-zero amount (use negative to deduct)");
        const { error } = await supabase.rpc("admin_credit_wallet", {
          _user_id: active.id, _amount: v, _description: note || "Admin adjustment",
        });
        if (error) throw error;
        toast.success("Wallet adjusted");
      } else if (action === "sms") {
        const v = parseInt(amount, 10);
        if (!Number.isFinite(v) || v === 0) throw new Error("Enter a non-zero credit amount");
        const { error } = await supabase.rpc("admin_grant_sms_credits", {
          _user_id: active.id, _credits: v, _reason: note || null,
        });
        if (error) throw error;
        toast.success(`Granted ${v} SMS credits`);
      } else if (action === "role") {
        if (!hasRole("super_admin")) throw new Error("Only super_admin can change roles");
        const { error } = await supabase.rpc("admin_set_role", {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          _user_id: active.id, _role: role as any,
        });
        if (error) throw error;
        toast.success("Role updated");
      }
      setAction(null);
      setActive(null);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Action failed");
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Users" description="All registered customers, with roles, wallet balance and SMS credits." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search name, company, phone, role…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="All users" description={`${filtered.length} of ${rows.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">Name</th>
                <th className="py-3 pr-4 font-medium">Company</th>
                <th className="py-3 pr-4 font-medium">Phone</th>
                <th className="py-3 pr-4 font-medium">Role</th>
                <th className="py-3 pr-4 font-medium text-right">Wallet</th>
                <th className="py-3 pr-4 font-medium text-right">SMS</th>
                <th className="py-3 pr-4 font-medium">Joined</th>
                <th className="py-3 pr-4 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((u) => (
                <tr key={u.id}>
                  <td className="py-3 pr-4 font-medium">{[u.first_name, u.last_name].filter(Boolean).join(" ") || "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{u.company ?? "—"}</td>
                  <td className="py-3 pr-4 text-muted-foreground">{u.phone ?? "—"}</td>
                  <td className="py-3 pr-4"><RolePill role={u.role ?? "client"} /></td>
                  <td className="py-3 pr-4 text-right font-medium">{formatKES(u.wallet ?? 0)}</td>
                  <td className="py-3 pr-4 text-right">{u.sms ?? 0}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="py-3 pr-4 text-right">
                    <div className="flex justify-end gap-1">
                      <Button size="sm" variant="outline" onClick={() => open(u, "wallet")}>
                        <Wallet className="mr-1 h-3 w-3" /> Wallet
                      </Button>
                      <Button size="sm" variant="outline" onClick={() => open(u, "sms")}>
                        <MessageSquare className="mr-1 h-3 w-3" /> SMS
                      </Button>
                      {hasRole("super_admin") && (
                        <Button size="sm" variant="outline" onClick={() => open(u, "role")}>
                          <ShieldCheck className="mr-1 h-3 w-3" /> Role
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No users match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Dialog open={!!action} onOpenChange={(v) => { if (!v) { setAction(null); setActive(null); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {action === "wallet" && "Adjust wallet"}
              {action === "sms" && "Grant SMS credits"}
              {action === "role" && "Change role"}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-3">
              <div className="rounded-lg bg-secondary p-3 text-sm">
                <div className="font-medium">{[active.first_name, active.last_name].filter(Boolean).join(" ") || "—"}</div>
                <div className="text-xs text-muted-foreground">{active.id}</div>
              </div>

              {action === "wallet" && (
                <>
                  <div className="space-y-1.5">
                    <Label>Amount (KES) — negative to deduct</Label>
                    <Input type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 500 or -200" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Note (visible in transactions)</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Promotional credit" />
                  </div>
                </>
              )}

              {action === "sms" && (
                <>
                  <div className="space-y-1.5">
                    <Label>SMS credits — negative to remove</Label>
                    <Input type="number" step="1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="e.g. 1000" />
                  </div>
                  <div className="space-y-1.5">
                    <Label>Reason</Label>
                    <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Welcome bonus" />
                  </div>
                </>
              )}

              {action === "role" && (
                <div className="space-y-1.5">
                  <Label>New role</Label>
                  <Select value={role} onValueChange={setRole}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="client">Client</SelectItem>
                      <SelectItem value="reseller">Reseller</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="super_admin">Super admin</SelectItem>
                    </SelectContent>
                  </Select>
                  <p className="text-xs text-muted-foreground">
                    This replaces all of the user's existing roles.
                  </p>
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => { setAction(null); setActive(null); }}>Cancel</Button>
            <Button onClick={() => void submit()}>Apply</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function RolePill({ role }: { role: string }) {
  const map: Record<string, string> = {
    client: "bg-zinc-100 text-zinc-700",
    reseller: "bg-blue-50 text-blue-700",
    admin: "bg-amber-50 text-amber-700",
    super_admin: "bg-emerald-50 text-emerald-700",
  };
  return (
    <span className={"inline-flex rounded-full px-2 py-0.5 text-xs font-medium capitalize " + (map[role] ?? "bg-zinc-100 text-zinc-700")}>
      {role.replace("_", " ")}
    </span>
  );
}
