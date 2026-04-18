/**
 * Phase 3 payment client helpers.
 *
 * M-Pesa STK Push runs in TEST MODE until Daraja sandbox credentials are added
 * to the project secrets (see `mpesa-stk-push` server route).
 *
 * In test mode the server simulates a successful payment after ~5 seconds so the
 * full UI/flow can be exercised end-to-end without real money or real Daraja keys.
 */

export interface StkPushRequest {
  invoice_id?: string | null;
  amount: number;
  phone: string;
  purpose: "invoice" | "wallet_topup";
}

export interface StkPushResponse {
  ok: boolean;
  attempt_id: string;
  test_mode: boolean;
  message: string;
}

export async function initiateMpesaStkPush(
  body: StkPushRequest,
  accessToken: string,
): Promise<StkPushResponse> {
  const res = await fetch("/api/mpesa/stk-push", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as StkPushResponse & { error?: string };
  if (!res.ok) {
    throw new Error(json.error ?? `STK push failed (${res.status})`);
  }
  return json;
}

export interface PaymentStatus {
  status: "initiated" | "pending" | "success" | "failed" | "cancelled" | "timeout";
  test_mode: boolean;
  invoice_id: string | null;
  amount: number;
  message?: string;
}

export async function getPaymentStatus(attemptId: string, accessToken: string): Promise<PaymentStatus> {
  const res = await fetch(`/api/mpesa/status?attempt_id=${encodeURIComponent(attemptId)}`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const json = (await res.json()) as PaymentStatus & { error?: string };
  if (!res.ok) throw new Error(json.error ?? `Status check failed (${res.status})`);
  return json;
}

export function normalizeKenyanPhone(input: string): string | null {
  const digits = input.replace(/\D/g, "");
  if (!digits) return null;
  // Accept 07XXXXXXXX, 7XXXXXXXX, 2547XXXXXXXX, +2547XXXXXXXX
  if (digits.startsWith("254") && digits.length === 12) return digits;
  if (digits.startsWith("0") && digits.length === 10) return "254" + digits.slice(1);
  if (digits.length === 9 && (digits.startsWith("7") || digits.startsWith("1"))) return "254" + digits;
  return null;
}
