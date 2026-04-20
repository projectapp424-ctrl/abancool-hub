import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Search, Send, Loader2 } from "lucide-react";
import { PageHeader, PanelCard } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { adminGetTickets, adminReplyToTicket, getTicket, type Ticket, type TicketReply } from "@/lib/whmcs.functions";

export const Route = createFileRoute("/admin/tickets")({
  component: AdminTickets,
});

interface AdminTicket extends Ticket {
  clientName: string;
  clientId: number;
}

function AdminTickets() {
  const [tickets, setTickets] = useState<AdminTicket[] | null>(null);
  const [q, setQ] = useState("");
  const [active, setActive] = useState<AdminTicket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [reply, setReply] = useState("");
  const [status, setStatus] = useState<"Open" | "Answered" | "Customer-Reply" | "Closed" | "In Progress" | "On Hold">("Answered");

  async function load() {
    const r = await adminGetTickets().catch(() => ({ tickets: [] }));
    setTickets(r.tickets as AdminTicket[]);
  }
  useEffect(() => { void load(); }, []);

  async function open(t: AdminTicket) {
    setActive(t);
    setReplies([]);
    const r = await getTicket({ data: { ticketId: t.id } }).catch(() => ({ ticket: null, replies: [] }));
    setReplies(r.replies);
  }

  async function send() {
    if (!active || !reply.trim()) return;
    try {
      await adminReplyToTicket({ data: { ticketId: active.id, message: reply.trim(), status } });
      setReply("");
      toast.success("Reply sent");
      await open(active);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed");
    }
  }

  const filtered = (tickets ?? []).filter((t) => {
    if (!q) return true;
    const v = q.toLowerCase();
    return [t.subject, t.tid, t.status, t.priority, t.department, t.clientName].some((x) => String(x).toLowerCase().includes(v));
  });

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Support tickets" description="All customer tickets across departments." />

      <div className="relative max-w-md">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input placeholder="Search subject, customer, status…" value={q} onChange={(e) => setQ(e.target.value)} className="pl-9" />
      </div>

      <PanelCard title="Tickets" description={tickets ? `${filtered.length} of ${tickets.length}` : "Loading..."}>
        {tickets === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">Number</th>
                  <th className="py-3 pr-4 font-medium">Subject</th>
                  <th className="py-3 pr-4 font-medium">Customer</th>
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
                    <td className="py-3 pr-4 font-mono text-xs">#{t.tid}</td>
                    <td className="py-3 pr-4 font-medium">{t.subject}</td>
                    <td className="py-3 pr-4 text-muted-foreground">{t.clientName || "—"}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{t.department}</td>
                    <td className="py-3 pr-4 capitalize text-muted-foreground">{t.priority}</td>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{t.lastReply ? new Date(t.lastReply).toLocaleString() : new Date(t.date).toLocaleString()}</td>
                    <td className="py-3 pr-4"><StatusBadge status={t.status} /></td>
                    <td className="py-3 pr-4 text-right">
                      <Button size="sm" variant="outline" onClick={() => void open(t)}>View</Button>
                    </td>
                  </tr>
                ))}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} className="py-10 text-center text-sm text-muted-foreground">No tickets match.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </PanelCard>

      <Dialog open={!!active} onOpenChange={(v) => { if (!v) setActive(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{active?.subject}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                #{active.tid} · {active.clientName} · {active.department} · {active.priority}
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading messages…</p>
                ) : replies.map((m) => (
                  <div key={m.id} className={"rounded-lg p-3 text-sm " + (m.admin ? "ml-6 bg-primary-soft" : "mr-6 bg-secondary")}>
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      {m.admin ? `Staff (${m.admin})` : "Customer"} · {new Date(m.date).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                ))}
              </div>
              <div className="grid gap-2 sm:grid-cols-[1fr_180px]">
                <div className="space-y-1.5">
                  <Label>Reply</Label>
                  <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
                </div>
                <div className="space-y-1.5">
                  <Label>New status</Label>
                  <Select value={status} onValueChange={(v) => setStatus(v as typeof status)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Open">Open</SelectItem>
                      <SelectItem value="Answered">Answered</SelectItem>
                      <SelectItem value="Customer-Reply">Customer Reply</SelectItem>
                      <SelectItem value="In Progress">In Progress</SelectItem>
                      <SelectItem value="On Hold">On Hold</SelectItem>
                      <SelectItem value="Closed">Closed</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
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
