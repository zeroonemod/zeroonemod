import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RATE_LIMIT_PER_HOUR = 5;
const HOUR_MS = 60 * 60 * 1000;
const INVALID = "Some details are missing or invalid. Please check the form and try again.";
const LIMITED = "You have sent several requests recently. Please try again later.";

type AdminClient = ReturnType<typeof createClient>;

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const text = (value: unknown, max: number): string | null => {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

const optionalText = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined || value === null || value === "") return null;
  return text(value, max) ?? undefined;
};

async function isOverLimit(admin: AdminClient, table: "contact_messages" | "partner_requests", email: string) {
  const since = new Date(Date.now() - HOUR_MS).toISOString();
  const { count, error } = await admin
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("email", email)
    .gte("created_at", since);
  if (error) throw error;
  return (count ?? 0) >= RATE_LIMIT_PER_HOUR;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") return json({ error: INVALID }, 400);

    if (typeof body.website === "string" && body.website.trim() !== "") {
      return json({ ok: true });
    }

    const email = text(body.email, 254)?.toLowerCase() ?? null;
    if (!email || !EMAIL.test(email) || body.consent !== true) {
      return json({ error: INVALID }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );
    const consentAt = new Date().toISOString();

    if (body.kind === "contact") {
      const name = text(body.name, 120);
      const subject = text(body.subject, 150);
      const message = text(body.message, 2000);
      if (!name || !subject || !message) return json({ error: INVALID }, 400);
      if (await isOverLimit(admin, "contact_messages", email)) return json({ error: LIMITED }, 429);

      const { error } = await admin
        .from("contact_messages")
        .insert({ name, email, subject, message, consent_at: consentAt });
      if (error) throw error;
      return json({ ok: true });
    }

    if (body.kind === "partner") {
      const companyName = text(body.companyName, 120);
      const contactName = text(body.contactName, 120);
      const country = text(body.country, 80);
      const phone = optionalText(body.phone, 30);
      const message = optionalText(body.message, 2000);
      if (!companyName || !contactName || !country || phone === undefined || message === undefined) {
        return json({ error: INVALID }, 400);
      }
      if (await isOverLimit(admin, "partner_requests", email)) return json({ error: LIMITED }, 429);

      const { error } = await admin.from("partner_requests").insert({
        company_name: companyName,
        contact_name: contactName,
        email,
        phone,
        country,
        message,
        consent_at: consentAt,
      });
      if (error) throw error;
      return json({ ok: true });
    }

    return json({ error: INVALID }, 400);
  } catch (err) {
    console.error("submit-request failed", err);
    return json({ error: "We could not send your request. Please try again in a moment." }, 500);
  }
});
