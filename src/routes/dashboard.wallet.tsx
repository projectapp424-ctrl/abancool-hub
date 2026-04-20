import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Wallet, ArrowDownLeft, ArrowUpRight, Smartphone } from "lucide-react";
import { useAuth } from "@/lib/auth";
import { supabase } from "@/integrations/supabase/client";
import { PageHeader, PanelCard, EmptyState, StatCard, formatKES } from "@/components/dashboard/Shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";

export const Route = createFileRoute("/dashboard/wallet")({
  component: WalletPage,
});

interface Tx {
  id: string; type: string; amount: number; description: string | null; created_at: string;
}

function WalletPage() {
  const { user } = useAuth();
  const [balance, setBalance] = useState<number | null>(null);
  const [txs, setTxs] = useState<Tx[] | null>(null);
  const [amount, setAmount] = useState("");

  async function refresh() {
    if (!user) return;
    const [b, t] = await Promise.all([
      supabase.from("wallet_balances").select("balance").eq("user_id", user.id).maybeSingle(),
      supabase
        .from("wallet_transactions")
        .select("id, type, amount, description, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(50),
    ]);
    setBalance(Number(b.data?.balance ?? 0));
    setTxs((t.data as Tx[]) ?? []);
  }

  useEffect(() => { void refresh(); }, [user]);

  function onTopUp(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!n || n < 50) { toast.error("Minimum top-up is KES 50."); return; }
    toast.info("Online wallet top-ups launch with the next release. Contact support to add credit manually.");
  }

  const credits = (txs ?? []).filter((t) => t.type === "deposit" || t.type === "refund").reduce((s, t) => s + Number(t.amount), 0);
  const debits = (txs ?? []).filter((t) => t.type === "payment").reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="mx-auto max-w-7xl space-y-6">
      <PageHeader title="Wallet" description="Pre-pay for services and use your balance at checkout." />

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard label="Current balance" value={balance == null ? "—" : formatKES(balance)} icon={<Wallet className="h-4 w-4" />} />
        <StatCard label="Total credits" value={formatKES(credits)} icon={<ArrowDownLeft className="h-4 w-4" />} />
        <StatCard label="Total spent" value={formatKES(debits)} icon={<ArrowUpRight className="h-4 w-4" />} />
      </div>

      <PanelCard title="Top up your wallet" description="Add funds to use across hosting, domains, POS and SMS.">
        <form onSubmit={onTopUp} className="flex flex-col gap-3 sm:flex-row sm:items-end">
          <div className="flex-1 space-y-1.5">
            <label htmlFor="amt" className="text-xs font-medium">Amount (KES)</label>
            <Input id="amt" type="number" min={50} step={50} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
          </div>
          <Button type="submit"><Smartphone className="mr-1 h-4 w-4" />Top up via M-Pesa</Button>
        </form>
        <p className="mt-3 text-xs text-muted-foreground">Online M-Pesa &amp; card top-ups launch with the next release.</p>
      </PanelCard>

      <PanelCard title="Transaction history" description={txs ? `${txs.length} transaction(s)` : "Loading..."}>
        {txs && txs.length === 0 ? (
          <EmptyState
            icon={<Wallet className="h-5 w-5" />}
            title="No transactions yet"
            description="Your wallet activity will appear here once you top up or pay an invoice."
          />
        ) : (
          <ul className="divide-y divide-border text-sm">
            {(txs ?? []).map((t) => {
              const positive = t.type === "deposit" || t.type === "refund";
              return (
                <li key={t.id} className="flex items-center justify-between py-3">
                  <div>
                    <div className="font-medium capitalize">{t.type}</div>
                    <div className="text-xs text-muted-foreground">
                      {t.description ?? "—"} · {new Date(t.created_at).toLocaleString()}
                    </div>
                  </div>
                  <div className={positive ? "font-semibold text-emerald-700" : "font-semibold text-foreground"}>
                    {positive ? "+" : "−"}{formatKES(Math.abs(Number(t.amount)))}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </PanelCard>
    </div>
  );
}
