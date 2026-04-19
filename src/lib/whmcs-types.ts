/**
 * Shared client/server types for WHMCS-backed data.
 * White-label: callers must never see "WHMCS" in any UI string.
 */

export type BillingCycle =
  | "monthly"
  | "quarterly"
  | "semiannually"
  | "annually"
  | "biennially"
  | "triennially"
  | "onetime"
  | "free";

export type ProductCategory =
  | "hosting"
  | "reseller_hosting"
  | "vps"
  | "pos"
  | "sms"
  | "domain"
  | "web_development"
  | "other";

export interface Product {
  pid: number;
  gid: number;
  type: string;
  name: string;
  description: string;
  module?: string;
  paytype?: string;
  groupName?: string;
  category: ProductCategory;
  pricing: {
    currency: string;
    monthly: number;
    quarterly: number;
    semiannually: number;
    annually: number;
    biennially: number;
    triennially: number;
    onetime: number;
  };
  features: string[]; // parsed bullets if present in description
}

export interface ClientService {
  id: number;
  productId: number;
  groupId: number;
  name: string;
  domain: string | null;
  status: string; // Active, Pending, Suspended, Terminated, Cancelled, Fraud
  billingCycle: string;
  amount: number;
  currency: string;
  nextDueDate: string | null;
  category: ProductCategory;
  username?: string | null;
  serverHostname?: string | null;
}

export interface ClientDomain {
  id: number;
  domainName: string;
  status: string;
  registrationDate: string | null;
  nextDueDate: string | null;
  recurringAmount: number;
  registrar: string | null;
  registrationPeriod: number;
}

export interface InvoiceLine {
  id: number;
  description: string;
  amount: number;
}

export interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string; // Unpaid, Paid, Cancelled, Refunded, Collections
  date: string;
  dueDate: string | null;
  datepaid: string | null;
  subtotal: number;
  tax: number;
  total: number;
  currency: string;
  paymentMethod: string | null;
  notes: string | null;
  lines?: InvoiceLine[];
}

export interface Ticket {
  id: number;
  tid: string;
  subject: string;
  status: string; // Open, Answered, Customer-Reply, Closed, In Progress
  priority: string;
  department: string;
  lastReply: string | null;
  date: string;
}

export interface TicketReply {
  id: string;
  message: string;
  date: string;
  admin: string | null;
  attachments?: { filename: string }[];
}

export interface ClientDetails {
  userId: number;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  companyName: string | null;
  address1: string | null;
  city: string | null;
  country: string | null;
  status: string;
  credit: number;
  currencyCode: string;
}

export interface AdminClientRow {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  companyName: string | null;
  status: string;
  credit: number;
  datecreated: string;
}
