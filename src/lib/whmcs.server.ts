/**
 * WHMCS API server-side wrapper.
 *
 * Calls the WHMCS REST API at WHMCS_URL/includes/api.php using identifier/secret
 * authentication. Never import this file from client-side code — credentials
 * live in process.env.
 *
 * White-label rule: NEVER expose the word "WHMCS" or any WHMCS-branded URL
 * to the customer. All errors are wrapped with generic messages.
 */

function getEnv(name: string): string | undefined {
  return (globalThis as unknown as { process?: { env?: Record<string, string> } }).process?.env?.[name];
}

export interface WhmcsConfig {
  url: string;
  identifier: string;
  secret: string;
}

function getConfig(): WhmcsConfig {
  const url = getEnv("WHMCS_URL");
  const identifier = getEnv("WHMCS_API_IDENTIFIER");
  const secret = getEnv("WHMCS_API_SECRET");
  if (!url || !identifier || !secret) {
    throw new Error("Billing service is not configured");
  }
  // Normalize: strip trailing slash
  return { url: url.replace(/\/+$/, ""), identifier, secret };
}

export type WhmcsParams = Record<string, string | number | boolean | null | undefined>;

export interface WhmcsResponse {
  result: "success" | "error";
  message?: string;
  [key: string]: unknown;
}

/**
 * Make a raw call to the WHMCS API.
 * Throws on network errors. Returns the JSON body even on result=error so
 * callers can inspect message.
 */
export async function whmcsCall<T extends WhmcsResponse = WhmcsResponse>(
  action: string,
  params: WhmcsParams = {},
): Promise<T> {
  const cfg = getConfig();
  const body = new URLSearchParams();
  body.set("action", action);
  body.set("identifier", cfg.identifier);
  body.set("secret", cfg.secret);
  body.set("responsetype", "json");
  for (const [k, v] of Object.entries(params)) {
    if (v === undefined || v === null) continue;
    body.set(k, String(v));
  }

  const res = await fetch(`${cfg.url}/includes/api.php`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: body.toString(),
  });

  if (!res.ok) {
    throw new Error(`Billing service returned ${res.status}`);
  }

  const text = await res.text();
  let json: T;
  try {
    json = JSON.parse(text) as T;
  } catch {
    throw new Error("Billing service returned invalid response");
  }
  return json;
}

/**
 * Wrap a WHMCS call and throw on error.
 */
export async function whmcsCallOrThrow<T extends WhmcsResponse = WhmcsResponse>(
  action: string,
  params: WhmcsParams = {},
): Promise<T> {
  const r = await whmcsCall<T>(action, params);
  if (r.result !== "success") {
    throw new Error(r.message || "Billing service request failed");
  }
  return r;
}

// ---------- Categorization ----------

export type ProductCategory =
  | "hosting"
  | "reseller_hosting"
  | "vps"
  | "pos"
  | "sms"
  | "domain"
  | "web_development"
  | "other";

/**
 * Auto-categorize a WHMCS product by its name + group name + module.
 * Used to split a flat product list across our category pages.
 */
export function categorizeProduct(name: string, groupName?: string, module?: string): ProductCategory {
  const haystack = `${name} ${groupName ?? ""} ${module ?? ""}`.toLowerCase();
  if (/\b(reseller)\b/.test(haystack)) return "reseller_hosting";
  if (/\b(vps|virtual\s*server|cloud\s*server|kvm)\b/.test(haystack)) return "vps";
  if (/\b(pos|point\s*of\s*sale|retail|restaurant|pharmacy|liquor)\b/.test(haystack)) return "pos";
  if (/\b(sms|bulk\s*sms|messaging|text)\b/.test(haystack)) return "sms";
  if (/\b(web\s*dev|web\s*design|website\s*design|landing\s*page)\b/.test(haystack)) return "web_development";
  if (/\b(domain|tld|registration)\b/.test(haystack) || /\.(com|net|org|co\.ke|africa|io)\b/.test(haystack)) return "domain";
  if (/\b(host|cpanel|plesk|directadmin)\b/.test(haystack)) return "hosting";
  return "other";
}
