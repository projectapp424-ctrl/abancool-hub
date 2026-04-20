import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LifeBuoy, Plus, Loader2, Send } from "lucide-react";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { toast } from "sonner";
import {
  getMyTickets,
  getTicket,
  openTicket,
  replyToTicket,
  type Ticket,
  type TicketReply,
} from "@/lib/whmcs.functions";

export const Route = createFileRoute("/dashboard/tickets")({
  component: TicketsPage,
});

function TicketsPage() {
  const [items, setItems] = useState<Ticket[] | null>(null);
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [form, setForm] = useState({ subject: "", message: "", priority: "Medium" as "Low" | "Medium" | "High" });
  const [active, setActive] = useState<Ticket | null>(null);
  const [replies, setReplies] = useState<TicketReply[]>([]);
  const [reply, setReply] = useState("");

  async function load() {
    const r = await getMyTickets().catch(() => ({ tickets: [] }));
    setItems(r.tickets);
  }
  useEffect(() => { void load(); }, []);

  async function viewTicket(t: Ticket) {
    setActive(t);
    setReplies([]);
    const r = await getTicket({ data: { ticketId: t.id } }).catch(() => ({ ticket: null, replies: [] }));
    setReplies(r.replies);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.subject.trim() || !form.message.trim()) {
      toast.error("Subject and message are required.");
      return;
    }
    setBusy(true);
    try {
      await openTicket({
        data: {
          subject: form.subject.trim(),
          message: form.message.trim(),
          priority: form.priority,
          department: 1,
        },
      });
      toast.success("Ticket opened. We'll respond shortly.");
      setOpen(false);
      setForm({ subject: "", message: "", priority: "Medium" });
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to create ticket");
    } finally {
      setBusy(false);
    }
  }

  async function sendReply() {
    if (!active || !reply.trim()) return;
    try {
      await replyToTicket({ data: { ticketId: active.id, message: reply.trim() } });
      setReply("");
      toast.success("Reply sent");
      await viewTicket(active);
      await load();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Failed to send reply");
    }
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
                <div className="space-y-2">
                  <Label htmlFor="prio">Priority</Label>
                  <select id="prio" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
                    value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value as "Low" | "Medium" | "High" })}>
                    <option value="Low">Low</option>
                    <option value="Medium">Medium</option>
                    <option value="High">High</option>
                  </select>
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
        {items === null ? (
          <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={<LifeBuoy className="h-5 w-5" />}
            title="No tickets yet"
            description="Have a question or running into trouble? Open a ticket and we'll help out."
          />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {items.map((t) => (
              <li key={t.id} className="flex cursor-pointer items-center justify-between py-3 hover:bg-secondary/40" onClick={() => void viewTicket(t)}>
                <div>
                  <div className="font-medium">{t.subject}</div>
                  <div className="text-xs text-muted-foreground">
                    #{t.tid} · {t.department} · updated {t.lastReply ? new Date(t.lastReply).toLocaleDateString() : new Date(t.date).toLocaleDateString()}
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

      <Dialog open={!!active} onOpenChange={(v) => { if (!v) setActive(null); }}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{active?.subject}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="text-xs text-muted-foreground">
                #{active.tid} · {active.department} · {active.priority} · <StatusBadge status={active.status} />
              </div>
              <div className="max-h-72 space-y-3 overflow-y-auto rounded-lg border border-border p-3">
                {replies.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Loading messages…</p>
                ) : replies.map((m) => (
                  <div key={m.id} className={"rounded-lg p-3 text-sm " + (m.admin ? "ml-6 bg-primary-soft" : "mr-6 bg-secondary")}>
                    <div className="mb-1 text-xs font-medium uppercase text-muted-foreground">
                      {m.admin ? "Staff" : "You"} · {new Date(m.date).toLocaleString()}
                    </div>
                    <div className="whitespace-pre-wrap">{m.message}</div>
                  </div>
                ))}
              </div>
              <div className="space-y-1.5">
                <Label>Your reply</Label>
                <Textarea rows={3} value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Type your reply…" />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActive(null)}>Close</Button>
            <Button onClick={() => void sendReply()} disabled={!reply.trim()}>
              <Send className="mr-1 h-4 w-4" /> Send reply
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
