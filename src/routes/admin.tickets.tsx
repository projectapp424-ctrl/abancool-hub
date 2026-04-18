import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { PageHeader, PanelCard } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/tickets")({
  component: AdminTickets,
});

interface Ticket {
  id: string;
  user_id: string;
  ticket_number: string;
  subject: string;
  status: string;
  priority: string;
  department: string;
  created_at: string;
  updated_at: string;
}
interface Msg {
  id: string;
  message: string;
  is_staff_reply: boolean;
  author_id: string;
  created_at: string;
}

function AdminTickets() {
  const { user } = useAuth();
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<Ticket | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [reply, setReply] = useState("");

  async function load() {
    const { data } = await supabase
      .from("support_tickets")
      .select("id, user_id, ticket_number, subject, status, priority, department, created_at, updated_at")
      .order("updated_at", { ascending: false })
      .limit(300);
    setTickets((data as Ticket[]) ?? []);
  }
  useEffect(() => { void load(); }, []);

  async function open(t: Ticket) {
    setActive(t);
    const { data } = await supabase
      .from("ticket_messages")
      .select("id, message, is_staff_reply, author_id, created_at")
      .eq("ticket_id", t.id)
      .order("created_at");
    setMsgs((data as Msg[]) ?? []);
  }

  async function setStatus(s: string) {
    if (!active) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const { error } = await supabase.from("support_tickets").update({ status: s as any }).eq("id", active.id);
    if (error) { toast.error(error.message); return; }
    setActive({ ...active, status: s });
    await load();
  }

  async function send() {
    if (!active || !user || !reply.trim()) return;
    const { error } = await supabase.from("ticket_messages").insert({
      ticket_id: active.id, message: reply.trim(), author_id: user.id, is_staff_reply: true,
    });
    if (error) { toast.error(error.message); return; }
    setReply("");
    await supabase.from("support_tickets").update({ status: "answered" }).eq("id", active.id);
    await open(active);
    await load();
  }

  const filtered = tickets.filter((t) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [t.subject, t.ticket_number, t.status, t.priority, t.department].some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Support tickets" description="All customer tickets across departments." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search subject, number, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Tickets" description={`${filtered.length} of ${tickets.length}`}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
              <tr className="border-b border-border">
                <th className="py-3 pr-4 font-medium">Number</th>
                <th className="py-3 pr-4 font-medium">Subject</th>
                <th className="py-3 pr-4 font-medium">Department</th>
                <th className="py-3 pr-4 font-medium">Priority</th>
                <th className="py-3 pr-4 font-medium">Updated</th>
                <th className="py-3 pr-4 font-medium">Status</th>
                <th className="py-3 pr-4 font-medium text-right">Open</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id}>
                  <td className="py-3 pr-4 font-mono text-xs">{t.ticket_number}</td>
                  <td className="py-3 pr-4 font-medium">{t.subject}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{t.department}</td>
                  <td className="py-3 pr-4 capitalize text-muted-foreground">{t.priority}</td>
                  <td className="py-3 pr-4 text-xs text-muted-foreground">{new Date(t.updated_at).toLocaleString()}</td>
                  <td className="py-3 pr-4"><StatusBadge status={t.status} /></td>
                  <td className="py-3 pr-4 text-right">
                    <Button size="sm" variant="outline" onClick={() => void open(t)}>View</Button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr><td colSpan={7} className="py-10 text-center text-sm text-muted-foreground">No tickets match.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </PanelCard>

      <Dialog open={!!active} onOpenChange={(v) => { if (!v) setActive(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between gap-3">
              <span>{active?.subject}</span>
              {active && (
                <Select value={active.status} onValueChange={(v) => void setStatus(v)}>
                  <SelectTrigger className="h-8 w-32"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="open">Open</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="answered">Answered</SelectItem>
                    <SelectItem value="closed">Closed</SelectItem>
                  </SelectContent>
                </Select>
              )}
            </DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                {active.ticket_number} · {active.department} · {active.priority}
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                {msgs.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No messages yet.</p>
                ) : msgs.map((m) => (
                  <div key={m.id} className={"rounded-lg p-3 text-sm " + (m.is_staff_reply ? "ml-6 bg-primary-soft" : "mr-6 bg-secondary")}>
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      {m.is_staff_reply ? "Staff" : "Customer"} · {new Date(m.created_at).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Reply as staff</Label>
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
            <Button onClick={() => void send()} disabled={!reply.trim()}>
              <Send className="mr-1 h-4 w-4" /> Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
