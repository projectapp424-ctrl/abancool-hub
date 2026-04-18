import { useEffect, useState } from "react";
import { Loader2, Smartphone, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/lib/auth";
import { initiateMpesaStkPush, getPaymentStatus, normalizeKenyanPhone } from "@/lib/payments";
import { formatKES } from "@/components/dashboard/Shell";
import { toast } from "sonner";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  amount: number;
  purpose: "invoice" | "wallet_topup";
  invoiceId?: string | null;
  defaultPhone?: string | null;
  onSuccess?: () => void;
}

type Stage = "form" | "waiting" | "success" | "failed";

export function MpesaPaymentDialog({
  open, onOpenChange, amount, purpose, invoiceId, defaultPhone, onSuccess,
}: Props) {
  const { session, profile } = useAuth();
  const [phone, setPhone] = useState("");
  const [stage, setStage] = useState<Stage>("form");
  const [attemptId, setAttemptId] = useState<string | null>(null);
  const [testMode, setTestMode] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      setPhone(defaultPhone ?? profile?.phone ?? "");
      setStage("form");
      setAttemptId(null);
      setErrorMsg(null);
    }
  }, [open, defaultPhone, profile?.phone]);

  // Poll status while waiting
  useEffect(() => {
    if (stage !== "waiting" || !attemptId || !session?.access_token) return;
    let cancelled = false;
    let tries = 0;
    const tick = async () => {
      if (cancelled) return;
      tries++;
      try {
        const s = await getPaymentStatus(attemptId, session.access_token);
        if (cancelled) return;
        if (s.status === "success") { setStage("success"); onSuccess?.(); return; }
        if (s.status === "failed" || s.status === "cancelled" || s.status === "timeout") {
          setErrorMsg(s.message ?? "Payment was not completed.");
          setStage("failed");
          return;
        }
      } catch (e) {
        console.error(e);
      }
      if (tries > 30) {
        setErrorMsg("Timed out waiting for confirmation. Check the dashboard later.");
        setStage("failed");
        return;
      }
      setTimeout(tick, 3000);
    };
    void tick();
    return () => { cancelled = true; };
  }, [stage, attemptId, session?.access_token, onSuccess]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!session?.access_token) { toast.error("Please sign in"); return; }
    const normalized = normalizeKenyanPhone(phone);
    if (!normalized) { toast.error("Enter a valid Kenyan phone number (e.g. 0712345678)"); return; }
    setStage("waiting");
    setErrorMsg(null);
    try {
      const r = await initiateMpesaStkPush(
        { invoice_id: invoiceId ?? null, amount, phone: normalized, purpose },
        session.access_token,
      );
      setAttemptId(r.attempt_id);
      setTestMode(r.test_mode);
      if (r.test_mode) toast.info("Test mode: payment auto-completes in ~5 seconds.");
    } catch (e) {
      setErrorMsg(e instanceof Error ? e.message : "Failed to initiate payment");
      setStage("failed");
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Smartphone className="h-5 w-5 text-primary" />
            Pay with M-Pesa
          </DialogTitle>
          <DialogDescription>
            Amount: <span className="font-semibold text-foreground">{formatKES(amount)}</span>
          </DialogDescription>
        </DialogHeader>

        {stage === "form" && (
          <form onSubmit={onSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="phone">M-Pesa phone number</Label>
              <Input
                id="phone" type="tel" inputMode="tel" required
                value={phone} onChange={(e) => setPhone(e.target.value)}
                placeholder="0712345678"
              />
              <p className="text-xs text-muted-foreground">You'll receive a payment prompt on this number.</p>
            </div>
            <DialogFooter>
              <Button type="button" variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
              <Button type="submit">Send payment request</Button>
            </DialogFooter>
          </form>
        )}

        {stage === "waiting" && (
          <div className="space-y-4 py-4 text-center">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-primary" />
            <div>
              <p className="font-medium">Waiting for confirmation…</p>
              <p className="mt-1 text-xs text-muted-foreground">
                {testMode ? "Test mode — completing automatically." : `Check your phone and enter your M-Pesa PIN to authorize ${formatKES(amount)}.`}
              </p>
            </div>
          </div>
        )}

        {stage === "success" && (
          <div className="space-y-4 py-4 text-center">
            <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-600" />
            <div>
              <p className="font-medium">Payment received!</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Your account has been credited and any related services are now active.
              </p>
            </div>
            <Button className="w-full" onClick={() => onOpenChange(false)}>Done</Button>
          </div>
        )}

        {stage === "failed" && (
          <div className="space-y-4 py-4 text-center">
            <XCircle className="mx-auto h-10 w-10 text-destructive" />
            <div>
              <p className="font-medium">Payment failed</p>
              <p className="mt-1 text-xs text-muted-foreground">{errorMsg ?? "Please try again."}</p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" className="flex-1" onClick={() => onOpenChange(false)}>Close</Button>
              <Button className="flex-1" onClick={() => setStage("form")}>Try again</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
