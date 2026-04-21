/**
 * Server functions wrapping WHMCS API calls.
 * Safe to import from client code — TanStack Start strips the handlers in browser bundles.
 *
 * White-label rule: callers (UI) must never see WHMCS branding in any field.
 */
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { whmcsCall, whmcsCallOrThrow, categorizeProduct } from "./whmcs.server";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type {
  Product,
  ClientService,
  ClientDomain,
  Invoice,
  Ticket,
  TicketReply,
  ClientDetails,
  AdminClientRow,
  ProductCategory,
} from "./whmcs-types";

// ---------- Internal helpers ----------

function num(v: unknown, fallback = 0): number {
  if (v == null || v === "") return fallback;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : fallback;
}

function str(v: unknown, fallback = ""): string {
  if (v == null) return fallback;
  return String(v);
}

function strOrNull(v: unknown): string | null {
  if (v == null || v === "" || v === "0000-00-00") return null;
  return String(v);
}

/** Parse `<ul><li>...</li></ul>` or newline-separated bullets out of a product description. */
function parseFeatures(description: string): string[] {
  if (!description) return [];
  // Try HTML <li> first
  const liMatches = description.match(/<li[^>]*>([\s\S]*?)<\/li>/gi);
  if (liMatches?.length) {
    return liMatches
      .map((m) => m.replace(/<[^>]+>/g, "").trim())
      .filter(Boolean)
      .slice(0, 12);
  }
  // Fallback: split on newlines or `* ` bullets
  return description
    .replace(/<[^>]+>/g, "\n")
    .split(/\r?\n|\u2022|^\s*[-*]\s+/gm)
    .map((s) => s.trim())
    .filter((s) => s.length > 0 && s.length < 200)
    .slice(0, 8);
}

/** Look up the WHMCS client_id linked to the authenticated Supabase user. */
async function requireWhmcsClientId(userId: string): Promise<number> {
  const { data, error } = await supabaseAdmin
    .from("profiles")
    .select("whmcs_client_id")
    .eq("id", userId)
    .maybeSingle();
  if (error) throw new Error("Could not load profile");
  const id = data?.whmcs_client_id;
  if (!id) throw new Error("Your account is not yet linked to billing. Please contact support.");
  return Number(id);
}

// ---------- PUBLIC: Products / Pricing ----------

export const getProducts = createServerFn({ method: "GET" })
  .inputValidator(
    z.object({
      category: z
        .enum(["hosting", "reseller_hosting", "vps", "pos", "sms", "domain", "web_development", "other", "all"])
        .default("all"),
    }).parse,
  )
  .handler(async ({ data }): Promise<{ products: Product[] }> => {
    try {
      const r = await whmcsCallOrThrow("GetProducts");
      // WHMCS returns: { products: { product: [ {pid, gid, name, description, module, paytype, pricing: {...}, ...}, ... ] } }
      const raw = (r as unknown as {
        products?: {
          product?: Array<{
            pid: number;
            gid: number;
            type?: string;
            name?: string;
            description?: string;
            module?: string;
            paytype?: string;
            pricing?: Record<string, { monthly?: string; quarterly?: string; semiannually?: string; annually?: string; biennially?: string; triennially?: string; msetupfee?: string }>;
          }>;
        };
      }).products?.product;

      // Also fetch product groups so we can resolve groupName for better categorization
      let groupNames: Record<number, string> = {};
      try {
        const g = await whmcsCallOrThrow("GetProducts", { module: "" });
        // Some WHMCS versions return groupname inline; fallback to GetClientGroups not applicable.
        // Use embedded groupname if present.
        const items = (g as unknown as { products?: { product?: Array<{ gid: number; groupname?: string }> } }).products?.product;
        for (const p of items ?? []) {
          if (p.gid && p.groupname) groupNames[p.gid] = p.groupname;
        }
      } catch {
        groupNames = {};
      }

      const products: Product[] = (raw ?? []).map((p) => {
        const groupName = groupNames[p.gid];
        const category = categorizeProduct(p.name ?? "", groupName, p.module);
        const pricingRaw = p.pricing ?? {};
        // Pricing per currency — pick the first currency (usually KES)
        const firstCurrency = Object.keys(pricingRaw)[0] ?? "KES";
        const cur = pricingRaw[firstCurrency] ?? {};
        return {
          pid: Number(p.pid),
          gid: Number(p.gid),
          type: str(p.type, "hostingaccount"),
          name: str(p.name),
          description: str(p.description),
          module: p.module,
          paytype: p.paytype,
          groupName,
          category,
          pricing: {
            currency: firstCurrency,
            monthly: num(cur.monthly, -1),
            quarterly: num(cur.quarterly, -1),
            semiannually: num(cur.semiannually, -1),
            annually: num(cur.annually, -1),
            biennially: num(cur.biennially, -1),
            triennially: num(cur.triennially, -1),
            onetime: num(cur.msetupfee, 0),
          },
          features: parseFeatures(str(p.description)),
        };
      });

      const filtered =
        data.category === "all" ? products : products.filter((p) => p.category === data.category);
      return { products: filtered };
    } catch (e) {
      console.error("[whmcs.getProducts]", e);
      return { products: [] };
    }
  });

// ---------- AUTH BRIDGE ----------

export const linkOrCreateWhmcsClient = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      firstName: z.string().min(1).max(60),
      lastName: z.string().min(1).max(60),
      email: z.string().email(),
      phone: z.string().max(40).optional(),
      companyName: z.string().max(120).optional(),
      country: z.string().max(80).optional().default("KE"),
      address1: z.string().max(200).optional().default("N/A"),
      city: z.string().max(80).optional().default("Nairobi"),
      state: z.string().max(80).optional().default("Nairobi"),
      postcode: z.string().max(20).optional().default("00100"),
      password: z.string().min(8).max(200).optional(),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<{ clientId: number }> => {
    const { userId } = context as { userId: string };

    // Already linked?
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("whmcs_client_id")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.whmcs_client_id) {
      return { clientId: Number(profile.whmcs_client_id) };
    }

    // Try to find existing client by email
    let clientId: number | null = null;
    try {
      const lookup = await whmcsCall("GetClientsDetails", { email: data.email });
      if (lookup.result === "success" && lookup.userid) {
        clientId = Number(lookup.userid);
      }
    } catch {
      /* ignore */
    }

    if (!clientId) {
      // Create new client. WHMCS requires password2.
      const tempPassword = data.password ?? `Aban-${Math.random().toString(36).slice(2, 12)}!A1`;
      const created = await whmcsCallOrThrow("AddClient", {
        firstname: data.firstName,
        lastname: data.lastName,
        email: data.email,
        address1: data.address1,
        city: data.city,
        state: data.state,
        postcode: data.postcode,
        country: data.country,
        phonenumber: data.phone ?? "",
        companyname: data.companyName ?? "",
        password2: tempPassword,
        skipvalidation: true,
        noemail: true,
      });
      clientId = Number((created as unknown as { clientid?: number }).clientid);
    }

    if (!clientId) throw new Error("Could not create billing account");

    await supabaseAdmin
      .from("profiles")
      .update({ whmcs_client_id: clientId, whmcs_synced_at: new Date().toISOString() })
      .eq("id", userId);

    return { clientId };
  });

export const validateExternalLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1).max(200),
    }).parse,
  )
  .handler(async ({ data }): Promise<{ ok: true; clientId: number; firstName: string; lastName: string } | { ok: false; message: string }> => {
    try {
      const r = await whmcsCall("ValidateLogin", {
        email: data.email,
        password2: data.password,
      });
      if (r.result !== "success") {
        return { ok: false, message: r.message ?? "Invalid email or password" };
      }
      const userid = Number((r as unknown as { userid?: number }).userid);
      if (!userid) return { ok: false, message: "Invalid email or password" };

      // Fetch details so we can return name
      const details = await whmcsCallOrThrow("GetClientsDetails", { clientid: userid, stats: false });
      const cd = (details as unknown as { client?: { firstname?: string; lastname?: string } }).client;
      return {
        ok: true,
        clientId: userid,
        firstName: str(cd?.firstname),
        lastName: str(cd?.lastname),
      };
    } catch (e) {
      console.error("[whmcs.validateExternalLogin]", e);
      return { ok: false, message: "Login service is currently unavailable" };
    }
  });

export const prepareExternalLogin = createServerFn({ method: "POST" })
  .inputValidator(
    z.object({
      email: z.string().email(),
      password: z.string().min(1).max(200),
    }).parse,
  )
  .handler(async ({ data }): Promise<{ ok: true } | { ok: false; message: string }> => {
    const valid = await validateExternalLogin({ data });
    if (!valid.ok) return valid;

    const email = data.email.trim().toLowerCase();
    const { data: users } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const existing = users.users.find((u) => u.email?.toLowerCase() === email);
    const userId = existing?.id ?? (await supabaseAdmin.auth.admin.createUser({
      email,
      password: data.password,
      email_confirm: true,
      user_metadata: { first_name: valid.firstName, last_name: valid.lastName },
    })).data.user?.id;

    if (!userId) return { ok: false, message: "Could not prepare your account" };
    if (existing) await supabaseAdmin.auth.admin.updateUserById(userId, { password: data.password });

    await supabaseAdmin.from("profiles").upsert({
      id: userId,
      first_name: valid.firstName || null,
      last_name: valid.lastName || null,
      whmcs_client_id: valid.clientId,
      whmcs_synced_at: new Date().toISOString(),
    });

    return { ok: true };
  });

// ---------- CLIENT-FACING ----------

export const getMyServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ services: ClientService[] }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetClientsProducts", { clientid: clientId });
      const products = (r as unknown as {
        products?: {
          product?: Array<{
            id: number;
            pid: number;
            gid?: number;
            name?: string;
            translated_name?: string;
            domain?: string;
            status?: string;
            billingcycle?: string;
            amount?: string;
            recurringamount?: string;
            firstpaymentamount?: string;
            nextduedate?: string;
            username?: string;
            serverhostname?: string;
            groupname?: string;
            paymentmethod?: string;
          }>;
        };
      }).products?.product;

      const services: ClientService[] = (products ?? []).map((p) => ({
        id: Number(p.id),
        productId: Number(p.pid),
        groupId: Number(p.gid ?? 0),
        name: str(p.translated_name ?? p.name ?? "Service"),
        domain: strOrNull(p.domain),
        status: str(p.status, "Active"),
        billingCycle: str(p.billingcycle, "Monthly"),
        amount: num(p.recurringamount ?? p.amount ?? p.firstpaymentamount, 0),
        currency: "KES",
        nextDueDate: strOrNull(p.nextduedate),
        category: categorizeProduct(str(p.name), p.groupname, undefined),
        username: p.username || null,
        serverHostname: p.serverhostname || null,
      }));
      return { services };
    } catch (e) {
      console.error("[whmcs.getMyServices]", e);
      return { services: [] };
    }
  });

export const getMyDomains = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ domains: ClientDomain[] }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetClientsDomains", { clientid: clientId });
      const items = (r as unknown as {
        domains?: {
          domain?: Array<{
            id: number;
            domainname: string;
            status?: string;
            regdate?: string;
            nextduedate?: string;
            recurringamount?: string;
            registrar?: string;
            regperiod?: number;
          }>;
        };
      }).domains?.domain;
      const domains: ClientDomain[] = (items ?? []).map((d) => ({
        id: Number(d.id),
        domainName: str(d.domainname),
        status: str(d.status, "Active"),
        registrationDate: strOrNull(d.regdate),
        nextDueDate: strOrNull(d.nextduedate),
        recurringAmount: num(d.recurringamount, 0),
        registrar: str(d.registrar) || null,
        registrationPeriod: num(d.regperiod, 1),
      }));
      return { domains };
    } catch (e) {
      console.error("[whmcs.getMyDomains]", e);
      return { domains: [] };
    }
  });

export const getMyInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ invoices: Invoice[] }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetInvoices", { userid: clientId, limitnum: 100 });
      const items = (r as unknown as {
        invoices?: {
          invoice?: Array<{
            id: number;
            invoicenum?: string;
            status?: string;
            date?: string;
            duedate?: string;
            datepaid?: string;
            subtotal?: string;
            tax?: string;
            total?: string;
            currencycode?: string;
            paymentmethod?: string;
            notes?: string;
          }>;
        };
      }).invoices?.invoice;
      const invoices: Invoice[] = (items ?? []).map((i) => ({
        id: Number(i.id),
        invoiceNumber: str(i.invoicenum) || `INV-${i.id}`,
        status: str(i.status, "Unpaid"),
        date: str(i.date),
        dueDate: strOrNull(i.duedate),
        datepaid: strOrNull(i.datepaid),
        subtotal: num(i.subtotal),
        tax: num(i.tax),
        total: num(i.total),
        currency: str(i.currencycode, "KES"),
        paymentMethod: str(i.paymentmethod) || null,
        notes: str(i.notes) || null,
      }));
      return { invoices };
    } catch (e) {
      console.error("[whmcs.getMyInvoices]", e);
      return { invoices: [] };
    }
  });

export const getInvoice = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ invoiceId: z.number().int().positive() }).parse)
  .handler(async ({ data, context }): Promise<{ invoice: Invoice | null }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetInvoice", { invoiceid: data.invoiceId });
      const i = r as unknown as {
        invoiceid?: number;
        invoicenum?: string;
        userid?: number;
        status?: string;
        date?: string;
        duedate?: string;
        datepaid?: string;
        subtotal?: string;
        tax?: string;
        total?: string;
        currencycode?: string;
        paymentmethod?: string;
        notes?: string;
        items?: { item?: Array<{ id: number; description: string; amount: string }> };
      };
      if (Number(i.userid) !== clientId) return { invoice: null };
      return {
        invoice: {
          id: Number(i.invoiceid),
          invoiceNumber: str(i.invoicenum) || `INV-${i.invoiceid}`,
          status: str(i.status),
          date: str(i.date),
          dueDate: strOrNull(i.duedate),
          datepaid: strOrNull(i.datepaid),
          subtotal: num(i.subtotal),
          tax: num(i.tax),
          total: num(i.total),
          currency: str(i.currencycode, "KES"),
          paymentMethod: str(i.paymentmethod) || null,
          notes: str(i.notes) || null,
          lines: (i.items?.item ?? []).map((it) => ({
            id: Number(it.id),
            description: str(it.description),
            amount: num(it.amount),
          })),
        },
      };
    } catch (e) {
      console.error("[whmcs.getInvoice]", e);
      return { invoice: null };
    }
  });

export const getMyTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ tickets: Ticket[] }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetTickets", { clientid: clientId, limitnum: 100 });
      const items = (r as unknown as {
        tickets?: {
          ticket?: Array<{
            id: number;
            tid: string;
            subject?: string;
            status?: string;
            urgency?: string;
            deptname?: string;
            lastreply?: string;
            date?: string;
          }>;
        };
      }).tickets?.ticket;
      const tickets: Ticket[] = (items ?? []).map((t) => ({
        id: Number(t.id),
        tid: str(t.tid),
        subject: str(t.subject),
        status: str(t.status, "Open"),
        priority: str(t.urgency, "Medium"),
        department: str(t.deptname, "Support"),
        lastReply: strOrNull(t.lastreply),
        date: str(t.date),
      }));
      return { tickets };
    } catch (e) {
      console.error("[whmcs.getMyTickets]", e);
      return { tickets: [] };
    }
  });

export const getTicket = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ ticketId: z.number().int().positive() }).parse)
  .handler(async ({ data, context }): Promise<{ ticket: Ticket | null; replies: TicketReply[] }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetTicket", { ticketid: data.ticketId });
      const t = r as unknown as {
        ticketid?: number;
        tid?: string;
        userid?: number;
        subject?: string;
        status?: string;
        urgency?: string;
        deptname?: string;
        date?: string;
        lastreply?: string;
        message?: string;
        replies?: { reply?: Array<{ replyid: string; message: string; date: string; admin?: string }> };
      };
      if (Number(t.userid) !== clientId) return { ticket: null, replies: [] };
      const ticket: Ticket = {
        id: Number(t.ticketid),
        tid: str(t.tid),
        subject: str(t.subject),
        status: str(t.status, "Open"),
        priority: str(t.urgency, "Medium"),
        department: str(t.deptname, "Support"),
        lastReply: strOrNull(t.lastreply),
        date: str(t.date),
      };
      const replies: TicketReply[] = [];
      // First message
      if (t.message) {
        replies.push({ id: "0", message: str(t.message), date: str(t.date), admin: null });
      }
      for (const rep of t.replies?.reply ?? []) {
        replies.push({
          id: str(rep.replyid),
          message: str(rep.message),
          date: str(rep.date),
          admin: rep.admin || null,
        });
      }
      return { ticket, replies };
    } catch (e) {
      console.error("[whmcs.getTicket]", e);
      return { ticket: null, replies: [] };
    }
  });

export const openTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      subject: z.string().min(2).max(200),
      message: z.string().min(2).max(8000),
      department: z.coerce.number().int().positive().default(1),
      priority: z.enum(["Low", "Medium", "High"]).default("Medium"),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<{ ticketId: number }> => {
    const { userId } = context as { userId: string };
    const clientId = await requireWhmcsClientId(userId);
    const r = await whmcsCallOrThrow("OpenTicket", {
      clientid: clientId,
      subject: data.subject,
      message: data.message,
      deptid: data.department,
      priority: data.priority,
    });
    const ticketid = Number((r as unknown as { id?: number }).id);
    return { ticketId: ticketid };
  });

export const replyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      ticketId: z.number().int().positive(),
      message: z.string().min(1).max(8000),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context as { userId: string };
    const clientId = await requireWhmcsClientId(userId);
    await whmcsCallOrThrow("AddTicketReply", {
      ticketid: data.ticketId,
      clientid: clientId,
      message: data.message,
    });
    return { ok: true };
  });

export const getMyDetails = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ details: ClientDetails | null }> => {
    const { userId } = context as { userId: string };
    try {
      const clientId = await requireWhmcsClientId(userId);
      const r = await whmcsCallOrThrow("GetClientsDetails", { clientid: clientId, stats: true });
      const c = (r as unknown as { client?: Record<string, unknown>; stats?: { credit?: string } }).client ?? {};
      return {
        details: {
          userId: clientId,
          firstName: str(c.firstname),
          lastName: str(c.lastname),
          email: str(c.email),
          phone: str(c.phonenumber) || null,
          companyName: str(c.companyname) || null,
          address1: str(c.address1) || null,
          city: str(c.city) || null,
          country: str(c.country) || null,
          status: str(c.status, "Active"),
          credit: num((r as unknown as { stats?: { credit?: string } }).stats?.credit, 0),
          currencyCode: str(c.currency_code, "KES"),
        },
      };
    } catch (e) {
      console.error("[whmcs.getMyDetails]", e);
      return { details: null };
    }
  });

// ---------- CHECKOUT (place an order) ----------

export const placeOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      items: z
        .array(
          z.object({
            pid: z.number().int().positive(),
            billingCycle: z.string().default("monthly"),
            domain: z.string().max(120).optional(),
            quantity: z.number().int().min(1).max(20).default(1),
          }),
        )
        .min(1)
        .max(20),
      paymentMethod: z.string().max(60).default("mpesa"),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<{ orderId: number; invoiceId: number }> => {
    const { userId } = context as { userId: string };
    const clientId = await requireWhmcsClientId(userId);

    // WHMCS AddOrder accepts pid, billingcycle, domain as parallel arrays via pid[N]/billingcycle[N]/domain[N]
    // Easiest: place separate orders if multiple items differ wildly; for now we support one combined order.
    const params: Record<string, string | number | boolean> = {
      clientid: clientId,
      paymentmethod: data.paymentMethod,
    };
    data.items.forEach((it, i) => {
      params[`pid[${i}]`] = it.pid;
      params[`billingcycle[${i}]`] = it.billingCycle;
      if (it.domain) params[`domain[${i}]`] = it.domain;
    });

    const r = await whmcsCallOrThrow("AddOrder", params);
    return {
      orderId: Number((r as unknown as { orderid?: number }).orderid),
      invoiceId: Number((r as unknown as { invoiceid?: number }).invoiceid),
    };
  });

// ---------- ADMIN ----------

async function requireAdmin(userId: string): Promise<void> {
  const { data, error } = await supabaseAdmin.rpc("is_staff", { _user_id: userId });
  if (error || !data) throw new Error("Forbidden");
}

export const adminGetClients = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ search: z.string().max(120).optional() }).parse)
  .handler(async ({ data, context }): Promise<{ clients: AdminClientRow[] }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    try {
      const r = await whmcsCallOrThrow("GetClients", {
        limitnum: 200,
        search: data.search ?? "",
      });
      const items = (r as unknown as {
        clients?: {
          client?: Array<{
            id: number;
            firstname?: string;
            lastname?: string;
            email?: string;
            companyname?: string;
            status?: string;
            credit?: string;
            datecreated?: string;
          }>;
        };
      }).clients?.client;
      const clients: AdminClientRow[] = (items ?? []).map((c) => ({
        id: Number(c.id),
        firstName: str(c.firstname),
        lastName: str(c.lastname),
        email: str(c.email),
        companyName: str(c.companyname) || null,
        status: str(c.status, "Active"),
        credit: num(c.credit, 0),
        datecreated: str(c.datecreated),
      }));
      return { clients };
    } catch (e) {
      console.error("[whmcs.adminGetClients]", e);
      return { clients: [] };
    }
  });

export const adminGetServices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ services: Array<ClientService & { clientId: number; clientName: string; clientEmail: string }> }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    try {
      // GetClientsProducts without clientid returns recent across all clients
      const r = await whmcsCallOrThrow("GetClientsProducts", { limitnum: 200 });
      const products = (r as unknown as {
        products?: {
          product?: Array<{
            id: number;
            clientid: number;
            firstname?: string;
            lastname?: string;
            client_email?: string;
            pid: number;
            gid?: number;
            name?: string;
            translated_name?: string;
            domain?: string;
            status?: string;
            billingcycle?: string;
            recurringamount?: string;
            nextduedate?: string;
            groupname?: string;
            username?: string;
            serverhostname?: string;
          }>;
        };
      }).products?.product;
      const services = (products ?? []).map((p) => ({
        id: Number(p.id),
        productId: Number(p.pid),
        groupId: Number(p.gid ?? 0),
        clientId: Number(p.clientid),
        clientName: `${str(p.firstname)} ${str(p.lastname)}`.trim(),
        clientEmail: str(p.client_email),
        name: str(p.translated_name ?? p.name),
        domain: strOrNull(p.domain),
        status: str(p.status, "Active"),
        billingCycle: str(p.billingcycle, "Monthly"),
        amount: num(p.recurringamount, 0),
        currency: "KES",
        nextDueDate: strOrNull(p.nextduedate),
        category: categorizeProduct(str(p.name), p.groupname, undefined),
        username: p.username || null,
        serverHostname: p.serverhostname || null,
      }));
      return { services };
    } catch (e) {
      console.error("[whmcs.adminGetServices]", e);
      return { services: [] };
    }
  });

export const adminSetServiceStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      serviceId: z.number().int().positive(),
      action: z.enum(["suspend", "unsuspend", "terminate"]),
      suspendReason: z.string().max(200).optional(),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    const actionMap = {
      suspend: "ModuleSuspend",
      unsuspend: "ModuleUnsuspend",
      terminate: "ModuleTerminate",
    } as const;
    await whmcsCallOrThrow(actionMap[data.action], {
      serviceid: data.serviceId,
      suspendreason: data.suspendReason ?? "",
    });
    return { ok: true };
  });

export const adminGetInvoices = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ status: z.string().max(40).optional() }).parse)
  .handler(async ({ data, context }): Promise<{ invoices: Array<Invoice & { clientName: string; clientId: number }> }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    try {
      const params: Record<string, string | number> = { limitnum: 200 };
      if (data.status) params.status = data.status;
      const r = await whmcsCallOrThrow("GetInvoices", params);
      const items = (r as unknown as {
        invoices?: {
          invoice?: Array<{
            id: number;
            userid: number;
            firstname?: string;
            lastname?: string;
            invoicenum?: string;
            status?: string;
            date?: string;
            duedate?: string;
            datepaid?: string;
            subtotal?: string;
            tax?: string;
            total?: string;
            currencycode?: string;
            paymentmethod?: string;
          }>;
        };
      }).invoices?.invoice;
      const invoices = (items ?? []).map((i) => ({
        id: Number(i.id),
        clientId: Number(i.userid),
        clientName: `${str(i.firstname)} ${str(i.lastname)}`.trim(),
        invoiceNumber: str(i.invoicenum) || `INV-${i.id}`,
        status: str(i.status, "Unpaid"),
        date: str(i.date),
        dueDate: strOrNull(i.duedate),
        datepaid: strOrNull(i.datepaid),
        subtotal: num(i.subtotal),
        tax: num(i.tax),
        total: num(i.total),
        currency: str(i.currencycode, "KES"),
        paymentMethod: str(i.paymentmethod) || null,
        notes: null,
      }));
      return { invoices };
    } catch (e) {
      console.error("[whmcs.adminGetInvoices]", e);
      return { invoices: [] };
    }
  });

export const adminGetTickets = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ tickets: Array<Ticket & { clientName: string; clientId: number }> }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    try {
      const r = await whmcsCallOrThrow("GetTickets", { limitnum: 200 });
      const items = (r as unknown as {
        tickets?: {
          ticket?: Array<{
            id: number;
            tid: string;
            userid?: number;
            name?: string;
            subject?: string;
            status?: string;
            urgency?: string;
            deptname?: string;
            lastreply?: string;
            date?: string;
          }>;
        };
      }).tickets?.ticket;
      const tickets = (items ?? []).map((t) => ({
        id: Number(t.id),
        tid: str(t.tid),
        clientId: Number(t.userid ?? 0),
        clientName: str(t.name),
        subject: str(t.subject),
        status: str(t.status, "Open"),
        priority: str(t.urgency, "Medium"),
        department: str(t.deptname, "Support"),
        lastReply: strOrNull(t.lastreply),
        date: str(t.date),
      }));
      return { tickets };
    } catch (e) {
      console.error("[whmcs.adminGetTickets]", e);
      return { tickets: [] };
    }
  });

export const adminReplyToTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(
    z.object({
      ticketId: z.number().int().positive(),
      message: z.string().min(1).max(8000),
      status: z.enum(["Open", "Answered", "Customer-Reply", "Closed", "In Progress", "On Hold"]).optional(),
    }).parse,
  )
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    await whmcsCallOrThrow("AddTicketReply", {
      ticketid: data.ticketId,
      message: data.message,
      adminusername: "system",
    });
    if (data.status) {
      await whmcsCallOrThrow("UpdateTicket", { ticketid: data.ticketId, status: data.status });
    }
    return { ok: true };
  });

export const adminGetTransactions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ transactions: Array<{ id: number; transid: string; date: string; amount: number; gateway: string; description: string; userid: number; invoiceId: number; currency: string }> }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    try {
      const r = await whmcsCallOrThrow("GetTransactions", { limitnum: 200 });
      const items = (r as unknown as {
        transactions?: {
          transaction?: Array<{
            id: number;
            transid: string;
            userid?: number;
            invoiceid?: number;
            date?: string;
            amountin?: string;
            amountout?: string;
            gateway?: string;
            description?: string;
            currency?: string;
          }>;
        };
      }).transactions?.transaction;
      return {
        transactions: (items ?? []).map((t) => ({
          id: Number(t.id),
          transid: str(t.transid),
          date: str(t.date),
          amount: num(t.amountin) - num(t.amountout),
          gateway: str(t.gateway),
          description: str(t.description),
          userid: Number(t.userid ?? 0),
          invoiceId: Number(t.invoiceid ?? 0),
          currency: str(t.currency, "KES"),
        })),
      };
    } catch (e) {
      console.error("[whmcs.adminGetTransactions]", e);
      return { transactions: [] };
    }
  });

export const adminGetOrders = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<{ orders: Array<{ id: number; ordernum: string; userid: number; name: string; date: string; amount: number; status: string; paymentMethod: string }> }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    try {
      const r = await whmcsCallOrThrow("GetOrders", { limitnum: 200 });
      const items = (r as unknown as {
        orders?: {
          order?: Array<{
            id: number;
            ordernum?: string;
            userid?: number;
            name?: string;
            date?: string;
            amount?: string;
            status?: string;
            paymentmethod?: string;
          }>;
        };
      }).orders?.order;
      return {
        orders: (items ?? []).map((o) => ({
          id: Number(o.id),
          ordernum: str(o.ordernum),
          userid: Number(o.userid ?? 0),
          name: str(o.name),
          date: str(o.date),
          amount: num(o.amount),
          status: str(o.status, "Pending"),
          paymentMethod: str(o.paymentmethod),
        })),
      };
    } catch (e) {
      console.error("[whmcs.adminGetOrders]", e);
      return { orders: [] };
    }
  });

export const adminAcceptOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ orderId: z.number().int().positive() }).parse)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    await whmcsCallOrThrow("AcceptOrder", { orderid: data.orderId, autosetup: true, sendemail: true });
    return { ok: true };
  });

export const adminCancelOrder = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator(z.object({ orderId: z.number().int().positive(), cancelSub: z.boolean().default(false) }).parse)
  .handler(async ({ data, context }): Promise<{ ok: true }> => {
    const { userId } = context as { userId: string };
    await requireAdmin(userId);
    await whmcsCallOrThrow("CancelOrder", { orderid: data.orderId, cancelsub: data.cancelSub });
    return { ok: true };
  });

// Re-export types for convenience
export type { Product, ClientService, ClientDomain, Invoice, Ticket, TicketReply, ClientDetails, AdminClientRow, ProductCategory };
