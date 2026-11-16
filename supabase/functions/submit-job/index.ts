import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const BUCKET = "job-files";
const MAX_FILES = 20;
const FILE_TYPES = ["ECU", "TCU"];
const SERVICES = ["stage1_calibration", "original_restoration", "decoding", "other_modification", "not_sure"];
const CUSTOMER_TYPES = ["individual", "workshop"];
const FUEL_TYPES = ["Petrol", "Diesel", "Hybrid", "Other"];
const STORAGE_NAME = /^[A-Za-z0-9._-]{1,120}$/;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

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

const optionalText = (value: unknown, max: number): string | null => {
  if (value === undefined || value === null || value === "") return null;
  return text(value, max);
};

const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | null =>
  typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : null;

const parseFiles = (value: unknown) => {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_FILES) return null;
  const files: { storageName: string; originalName: string; sizeBytes: number; mimeType: string }[] = [];
  for (const item of value) {
    if (typeof item !== "object" || item === null) return null;
    const storageName = (item as Record<string, unknown>).storageName;
    const originalName = text((item as Record<string, unknown>).originalName, 200);
    const sizeBytes = (item as Record<string, unknown>).sizeBytes;
    const mimeType = (item as Record<string, unknown>).mimeType;
    if (typeof storageName !== "string" || !STORAGE_NAME.test(storageName)) return null;
    if (!originalName || typeof sizeBytes !== "number" || sizeBytes < 0) return null;
    files.push({
      storageName,
      originalName,
      sizeBytes,
      mimeType: typeof mimeType === "string" ? mimeType.slice(0, 120) : "application/octet-stream",
    });
  }
  return files;
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body || typeof body !== "object") {
      return json({ error: "The submission could not be read. Please try again." }, 400);
    }

    if (typeof body.website === "string" && body.website.trim() !== "") {
      return json({ error: "The submission could not be processed." }, 400);
    }

    const draftId = typeof body.draftId === "string" ? body.draftId : "";
    if (!/^[0-9a-f-]{36}$/i.test(draftId)) {
      return json({ error: "The submission could not be processed." }, 400);
    }

    const files = parseFiles(body.files);
    const fileType = oneOf(body.fileType, FILE_TYPES);
    const requestedService = oneOf(body.requestedService, SERVICES);
    const vehicle = (body.vehicle ?? {}) as Record<string, unknown>;
    const ecu = (body.ecu ?? {}) as Record<string, unknown>;
    const customer = (body.customer ?? {}) as Record<string, unknown>;
    const customerType = oneOf(customer.customerType, CUSTOMER_TYPES);
    const fuelType = oneOf(vehicle.fuelType, FUEL_TYPES);
    const email = typeof customer.email === "string" ? customer.email.trim().toLowerCase() : "";
    const year = typeof vehicle.year === "number" ? vehicle.year : Number(vehicle.year);
    const currentYear = new Date().getFullYear();

    const make = text(vehicle.make, 60);
    const model = text(vehicle.model, 60);
    const engine = text(vehicle.engine, 80);
    const vin = typeof vehicle.vin === "string" ? vehicle.vin.trim().toUpperCase() : "";
    const manufacturer = optionalText(ecu.manufacturer, 80);
    const hardwareNumber = optionalText(ecu.hardwareNumber, 80);
    const softwareNumber = optionalText(ecu.softwareNumber, 80);
    const firstName = text(customer.firstName, 80);
    const lastName = text(customer.lastName, 80);
    const country = text(customer.country, 80);
    const companyName = optionalText(customer.companyName, 120);
    const phone = optionalText(customer.phone, 30);
    const comments = optionalText(body.serviceComments, 1000);
    const identificationNumbers = optionalText(ecu.identificationNumbers, 300);
    const password = typeof body.password === "string" && body.password !== "" ? body.password : null;

    const invalid =
      !files || !fileType || !requestedService || !customerType || !fuelType ||
      !make || !model || !engine || !VIN.test(vin) ||
      !Number.isInteger(year) || year < 1950 || year > currentYear + 1 ||
      !firstName || !lastName || !EMAIL.test(email) || email.length > 254 || !country ||
      (customerType === "workshop" && !companyName) ||
      body.privacyConsent !== true ||
      (password !== null && (password.length < 8 || password.length > 72));

    if (invalid) {
      return json({ error: "Some details are missing or invalid. Please check the form and try again." }, 400);
    }

    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false, autoRefreshToken: false } },
    );

    const { data: pendingList, error: listError } = await admin.storage
      .from(BUCKET)
      .list(`pending/${draftId}`, { limit: 100 });
    if (listError) throw listError;

    const received = new Set((pendingList ?? []).map((item) => item.name));
    if (!files.every((file) => received.has(file.storageName))) {
      return json({ error: "Some files did not finish uploading. Please upload them again." }, 400);
    }

    const { data: job, error: jobError } = await admin
      .from("jobs")
      .insert({
        file_type: fileType,
        requested_service: requestedService,
        service_comments: comments,
        customer_type: customerType,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: email,
        customer_country: country,
        customer_phone: phone,
        company_name: customerType === "workshop" ? companyName : null,
        vehicle_make: make,
        vehicle_model: model,
        vehicle_year: year,
        vehicle_engine: engine,
        vehicle_fuel_type: fuelType,
        vehicle_vin: vin,
        ecu_manufacturer: manufacturer,
        ecu_hardware_number: hardwareNumber,
        ecu_software_number: softwareNumber,
        ecu_identification_numbers: identificationNumbers,
        privacy_consent_at: new Date().toISOString(),
      })
      .select("id, reference")
      .single();
    if (jobError) throw jobError;

    for (const file of files) {
      const { error: moveError } = await admin.storage
        .from(BUCKET)
        .move(`pending/${draftId}/${file.storageName}`, `${job.reference}/original/${file.storageName}`);
      if (moveError) throw moveError;
    }

    const { error: filesError } = await admin.from("job_files").insert(
      files.map((file) => ({
        job_id: job.id,
        kind: "original",
        file_name: file.originalName,
        storage_path: `${job.reference}/original/${file.storageName}`,
        size_bytes: Math.round(file.sizeBytes),
        mime_type: file.mimeType,
      })),
    );
    if (filesError) throw filesError;

    let accountStatus: "created" | "exists" | "invited" | "unavailable" = "unavailable";
    const siteUrl = Deno.env.get("SITE_URL") ?? "https://zeroonemod.com";

    if (password) {
      const { data: created, error: createError } = await admin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      });
      if (createError) {
        accountStatus = /already|registered|exists/i.test(createError.message) ? "exists" : "unavailable";
        if (accountStatus === "unavailable") console.error("createUser failed", createError.message);
      } else if (created.user) {
        accountStatus = "created";
        await linkNewAccount(admin, created.user.id, job.id, {
          firstName,
          lastName,
          companyName: customerType === "workshop" ? companyName : null,
          customerType,
          country,
          phone,
        });
      }
    } else {
      const { data: invited, error: inviteError } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl}/dashboard`,
      });
      if (inviteError) {
        accountStatus = /already|registered|exists/i.test(inviteError.message) ? "exists" : "unavailable";
        if (accountStatus === "unavailable") console.error("inviteUserByEmail failed", inviteError.message);
      } else if (invited.user) {
        accountStatus = "invited";
        await linkNewAccount(admin, invited.user.id, job.id, {
          firstName,
          lastName,
          companyName: customerType === "workshop" ? companyName : null,
          customerType,
          country,
          phone,
        });
      }
    }

    return json({ reference: job.reference, accountStatus }, 200);
  } catch (err) {
    console.error("submit-job failed", err);
    return json({ error: "We could not complete your submission. Please try again in a moment." }, 500);
  }
});

type AdminClient = ReturnType<typeof createClient>;

async function linkNewAccount(
  admin: AdminClient,
  userId: string,
  jobId: string,
  profile: {
    firstName: string;
    lastName: string;
    companyName: string | null;
    customerType: string;
    country: string;
    phone: string | null;
  },
) {
  const { error: jobError } = await admin.from("jobs").update({ user_id: userId }).eq("id", jobId);
  if (jobError) console.error("linking job to account failed", jobError.message);

  const { error: profileError } = await admin.from("profiles").upsert({
    id: userId,
    full_name: `${profile.firstName} ${profile.lastName}`,
    company_name: profile.companyName,
    customer_type: profile.customerType,
    country: profile.country,
    phone: profile.phone,
  });
  if (profileError) console.error("creating profile failed", profileError.message);
}
