/**
 * Hardcoded public catalog + WHMCS redirect helpers.
 * Temporary: while we work on full API integration, every "Order"/"Sign in"/
 * "Register" button on the public site routes the visitor straight to WHMCS.
 */

export const WHMCS_BASE = "https://client.abancool.com/index.php";
export const WHMCS_LOGIN_URL = `${WHMCS_BASE}/login`;
export const WHMCS_HOME_URL = WHMCS_BASE;
export const WHMCS_CART_URL = `${WHMCS_BASE}?rp=/store/cart`;
export const WHMCS_DOMAINS_URL = `${WHMCS_BASE}?rp=/domain/register`;
export const WHMCS_DOMAIN_TRANSFER_URL = `${WHMCS_BASE}?rp=/domain/transfer`;

/** Build an "Order Now" URL that takes the visitor to the WHMCS product config page. */
export function whmcsOrderUrl(pid: number, billingCycle?: string): string {
  const cycle = billingCycle ? `&billingcycle=${encodeURIComponent(billingCycle)}` : "";
  return `${WHMCS_BASE}?rp=/store/product&pid=${pid}${cycle}`;
}

export type PublicCycle = "monthly" | "annually";

export interface PublicPackage {
  pid: number;
  name: string;
  group: string; // e.g. "Shared Hosting"
  price: number; // KES
  cycle: PublicCycle;
  features: string[];
  popular?: boolean;
}

/** ---- Hardcoded catalog (mirrors the WHMCS store screenshots) ---- */

export const SHARED_HOSTING: PublicPackage[] = [
  {
    pid: 1,
    name: "Starter Hosting",
    group: "Shared Hosting",
    price: 2010,
    cycle: "annually",
    features: [
      "50 GB SSD Storage",
      "Unlimited MySQL Databases",
      "Unlimited Bandwidth",
      "Unlimited Email Addresses",
      "30 Day Money-back",
      "Free Let's Encrypt SSL",
      "Free Daily Backups",
      "cPanel Control Panel",
    ],
  },
  {
    pid: 2,
    name: "Business Hosting",
    group: "Shared Hosting",
    price: 3350,
    cycle: "annually",
    popular: true,
    features: [
      "70 GB SSD Storage",
      "Unlimited MySQL Databases",
      "Unlimited Bandwidth",
      "Unlimited Email Addresses",
      "30 Day Money-back",
      "Free Let's Encrypt SSL",
      "Free Daily Backups",
      "cPanel Control Panel",
    ],
  },
  {
    pid: 3,
    name: "Premium Hosting",
    group: "Shared Hosting",
    price: 4690,
    cycle: "annually",
    features: [
      "Unlimited Websites",
      "70 GB NVMe SSD Storage",
      "Unlimited Email Accounts",
      "Free SSL Certificates",
      "LiteSpeed Server",
      "Website Builder Included",
      "Softaculous 1-Click Installer",
      "Daily Backups",
    ],
  },
  {
    pid: 4,
    name: "Enterprise Hosting",
    group: "Shared Hosting",
    price: 6700,
    cycle: "annually",
    features: [
      "Unlimited Websites",
      "Unlimited NVMe SSD Storage",
      "Unlimited Email Accounts",
      "Unlimited Databases",
      "Free SSL Certificates",
      "LiteSpeed Server",
      "Website Builder Included",
      "Priority Support",
    ],
  },
];

export const RESELLER_HOSTING: PublicPackage[] = [
  {
    pid: 11,
    name: "Starter Reseller Hosting",
    group: "Reseller Hosting",
    price: 2010,
    cycle: "monthly",
    features: [
      "50 GB SSD Storage",
      "30 cPanel Accounts",
      "Unlimited MySQL Databases",
      "Unlimited Bandwidth",
      "Unlimited Email Addresses",
      "Free Let's Encrypt SSL",
      "Free Daily Backups",
      "cPanel Control Panel",
    ],
  },
  {
    pid: 12,
    name: "Basic Reseller Hosting",
    group: "Reseller Hosting",
    price: 3350,
    cycle: "monthly",
    popular: true,
    features: [
      "70 GB SSD Storage",
      "50 cPanel Accounts",
      "Unlimited MySQL Databases",
      "Unlimited Bandwidth",
      "Unlimited Email Addresses",
      "Free Let's Encrypt SSL",
      "Free Daily Backups",
      "cPanel Control Panel",
    ],
  },
  {
    pid: 13,
    name: "Premium Reseller Hosting",
    group: "Reseller Hosting",
    price: 4690,
    cycle: "monthly",
    features: [
      "100 GB SSD Storage",
      "80 cPanel Accounts",
      "Unlimited MySQL Databases",
      "Unlimited Bandwidth",
      "Unlimited Email Addresses",
      "Free Let's Encrypt SSL",
      "Free Daily Backups",
      "cPanel Control Panel",
    ],
  },
  {
    pid: 14,
    name: "Platinum Resellers Hosting",
    group: "Reseller Hosting",
    price: 6700,
    cycle: "monthly",
    features: [
      "120 GB SSD Storage",
      "100 cPanel Accounts",
      "Unlimited MySQL Databases",
      "Unlimited Bandwidth",
      "Unlimited Email Addresses",
      "Free Let's Encrypt SSL",
      "Free Daily Backups",
      "cPanel Control Panel",
    ],
  },
];

export const ABAN_HOSTING: PublicPackage[] = [
  {
    pid: 21,
    name: "Aban Hosting",
    group: "Aban Hosting",
    price: 402,
    cycle: "monthly",
    features: [
      "1 Website",
      "10 GB NVMe SSD Storage",
      "10 Email Accounts",
      "Free SSL Certificate",
      "LiteSpeed Server",
      "Website Builder Included",
      "Softaculous 1-Click Installer",
      "Weekly Backups",
      "1 MySQL Database",
      "cPanel Account",
    ],
  },
  {
    pid: 22,
    name: "Aban Business",
    group: "Aban Hosting",
    price: 938,
    cycle: "monthly",
    popular: true,
    features: [
      "3 Websites",
      "30 GB NVMe SSD Storage",
      "20 Email Accounts",
      "Free SSL Certificate",
      "LiteSpeed Server",
      "Website Builder Included",
      "Softaculous 1-Click Installer",
      "Weekly Backups",
      "1 MySQL Database",
      "cPanel Account",
    ],
  },
];

export const ALL_HOSTING_PACKAGES: PublicPackage[] = [
  ...SHARED_HOSTING,
  ...RESELLER_HOSTING,
  ...ABAN_HOSTING,
];
