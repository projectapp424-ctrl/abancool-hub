import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/tickets")({
  component: TicketsPage,
});

interface Ticket {
  id: string; ticket_number: string; subject: string; status: string;
  priority: string; department: string; created_at: string; updated_at: string;
}

function TicketsPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", priority: "medium", department: "support" });

  async function load() {
    if (!user) return;
    const { data } = await supabase
      .from("support_tickets")
      .select("id, ticket_number, subject, status, priority, department, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false });
    setItems((data as Ticket[]) ?? []);
  }
  useEffect(() => { void load(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [user]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!user) return;
    if (!form.subject.trim() || !form.message.trim()) { toast.error("Subject and message are required."); return; }
    setBusy(true);
    const { data: t, error } = await supabase
      .from("support_tickets")
      .insert({
        user_id: user.id, subject: form.subject.trim(),
        priority: form.priority as "low" | "medium" | "high" | "urgent",
        department: form.department,
      })
      .select("id").single();
    if (error || !t) { setBusy(false); toast.error(error?.message ?? "Failed to create ticket."); return; }
    const { error: msgErr } = await supabase.from("ticket_messages").insert({
      ticket_id: t.id, author_id: user.id, message: form.message.trim(), is_staff_reply: false,
    });
    setBusy(false);
    if (msgErr) { toast.error(msgErr.message); return; }
    toast.success("Ticket opened. We'll respond shortly.");
    setOpen(false);
    setForm({ subject: "", message: "", priority: "medium", department: "support" });
    void load();
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Support Tickets"
        description="Open a ticket and our team will respond within hours."
        actions={
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild><Button><Plus className="mr-1 h-4 w-4" />New ticket</Button></DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Open a new ticket</DialogTitle></DialogHeader>
              <form onSubmit={onSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="subject">Subject</Label>
                  <Input id="subject" maxLength={150} value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="dep">Department</Label>
                    <select id="dep" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.department} onChange={(e) => setForm({ ...form, department: e.target.value })}>
                      <option value="support">Technical Support</option>
                      <option value="billing">Billing</option>
                      <option value="sales">Sales</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="prio">Priority</Label>
                    <select id="prio" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                      value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="msg">Message</Label>
                  <Textarea id="msg" rows={5} maxLength={4000} value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={busy}>{busy ? "Submitting..." : "Submit ticket"}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        }
      />

      <PanelCard title="Your tickets" description={items ? `${items.length} ticket(s)` : "Loading..."}>
        {items && items.length === 0 ? (
          <EmptyState
            icon={<LifeBuoy className="h-5 w-5" />}
            title="No tickets yet"
            description="Have a question or running into trouble? Open a ticket and we'll help out."
          />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(items ?? []).map((t) => (
              <li key={t.id} className="flex items-center justify-between py-3">
                <div>
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    {t.ticket_number} · {t.department} · updated {new Date(t.updated_at).toLocaleDateString()}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs capitalize text-muted-foreground">{t.priority}</span>
                  <StatusBadge status={t.status} />
                </div>
              </li>
            ))}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
