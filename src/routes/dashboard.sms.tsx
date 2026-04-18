import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { MessageSquare, Send, Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState } from "@/components/dashboard/Shell";
import { StatusBadge } from "./dashboard.index";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/sms")({
  component: SmsPage,
});

interface SmsRow {
  id: string;
  recipient: string;
  message: string;
  status: string;
  cost_credits: number;
  created_at: string;
  sent_at: string | null;
  error_message: string | null;
}

function SmsPage() {
  const { user, session } = useAuth();
  const [credits, setCredits] = useState(0);
  const [messages, setMessages] = useState<SmsRow[]>([]);
  const [recipients, setRecipients] = useState("");
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  async function refresh() {
    if (!user) return;
    const [bal, msgs] = await Promise.all([
      supabase.from("sms_credits").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase.from("sms_messages")
        .select("id, recipient, message, status, cost_credits, created_at, sent_at, error_message")
        .eq("user_id", user.id).order("created_at", { ascending: false }).limit(100),
    ]);
    setCredits(Number(bal.data?.balance ?? 0));
    setMessages((msgs.data as SmsRow[]) ?? []);
  }
  useEffect(() => { void refresh(); }, [user]);

  const recipientList = recipients
    .split(/[\s,;\n]+/).map((r) => r.trim()).filter(Boolean);
  const segments = Math.max(1, Math.ceil(text.length / 160));
  const estCost = recipientList.length * segments;

  async function send() {
    if (!session) return;
    if (recipientList.length === 0) { toast.error("Add at least one recipient"); return; }
    if (!text.trim()) { toast.error("Type a message"); return; }
    setSending(true);
    try {
      const res = await fetch("/api/sms/send", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${session.access_token}`,
        },
        body: JSON.stringify({ recipients: recipientList, message: text.trim() }),
      });
      const json = (await res.json()) as { ok?: boolean; sent?: number; credits_used?: number; remaining?: number; test_mode?: boolean; error?: string };
      if (!res.ok) throw new Error(json.error ?? "Send failed");
      toast.success(`Sent ${json.sent} SMS · ${json.credits_used} credits used${json.test_mode ? " (test mode)" : ""}`);
      setRecipients(""); setText("");
      await refresh();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Send failed");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader
        title="Bulk SMS"
        description="Send branded SMS to one or many recipients."
        actions={<Button variant="outline" asChild><Link to="/bulk-sms">Buy more credits</Link></Button>}
      />

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase text-muted-foreground">SMS credits</div>
          <div className="mt-2 text-2xl font-bold">{credits.toLocaleString()}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase text-muted-foreground">Sent (last 100)</div>
          <div className="mt-2 text-2xl font-bold">{messages.length}</div>
        </div>
        <div className="rounded-2xl border border-border bg-card p-5 shadow-[var(--shadow-soft)]">
          <div className="text-xs uppercase text-muted-foreground">Failed</div>
          <div className="mt-2 text-2xl font-bold text-red-700">{messages.filter((m) => m.status === "failed").length}</div>
        </div>
      </div>

      <PanelCard title="New campaign" description="One credit per 160-character segment per recipient.">
        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-1.5">
            <Label>Recipients</Label>
            <Textarea
              rows={6}
              placeholder="0712345678&#10;0723456789&#10;254734567890"
              value={recipients}
              onChange={(e) => setRecipients(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">{recipientList.length} recipient(s). Separate by comma, space or newline.</p>
          </div>
          <div className="space-y-1.5">
            <Label>Message</Label>
            <Textarea rows={6} placeholder="Hi {name}, your order is ready for collection." value={text} onChange={(e) => setText(e.target.value)} maxLength={480} />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>{text.length} chars · {segments} segment{segments === 1 ? "" : "s"} per recipient</span>
              <span className={estCost > credits ? "text-red-700" : ""}>Cost: {estCost} credits</span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex justify-end">
          <Button onClick={() => void send()} disabled={sending || estCost === 0 || estCost > credits}>
            {sending ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : <Send className="mr-1 h-4 w-4" />}
            Send now
          </Button>
        </div>
      </PanelCard>

      <PanelCard title="Recent messages" description={`${messages.length} message(s)`}>
        {messages.length === 0 ? (
          <EmptyState
            icon={<MessageSquare className="h-5 w-5" />}
            title="No SMS sent yet"
            description="Buy a credit pack and your first message will appear here."
            action={<Button asChild><Link to="/bulk-sms">Buy SMS credits</Link></Button>}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="text-left text-xs uppercase tracking-wide text-muted-foreground">
                <tr className="border-b border-border">
                  <th className="py-3 pr-4 font-medium">When</th>
                  <th className="py-3 pr-4 font-medium">To</th>
                  <th className="py-3 pr-4 font-medium">Message</th>
                  <th className="py-3 pr-4 font-medium text-center">Cost</th>
                  <th className="py-3 pr-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {messages.map((m) => (
                  <tr key={m.id}>
                    <td className="py-3 pr-4 text-xs text-muted-foreground">{new Date(m.created_at).toLocaleString()}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{m.recipient}</td>
                    <td className="py-3 pr-4 max-w-md truncate" title={m.message}>{m.message}</td>
                    <td className="py-3 pr-4 text-center">{m.cost_credits}</td>
                    <td className="py-3 pr-4"><StatusBadge status={m.status === "sent" ? "active" : m.status === "failed" ? "overdue" : "pending"} /></td>
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
