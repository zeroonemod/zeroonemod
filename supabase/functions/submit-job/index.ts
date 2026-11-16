// Creates a job from the submission wizard (guests and signed-in customers or partners).
// Files are uploaded by the browser into pending/<draftId>/ first, then moved here into <reference>/original/.
import { clientIp, EMAIL, json, oneOf, optionalText, preflight, readJson, siteUrl, text } from '../_shared/http.ts';
import { adminClient, type AdminClient, getCaller, isRateLimited, logEvent, notificationEmail } from '../_shared/supabase.ts';
import { adminJobUrl, jobUrl, sendEmail } from '../_shared/email.ts';

const BUCKET = 'job-files';
const MAX_FILES = 20;
const FILE_TYPES = ['ECU', 'TCU'] as const;
const SERVICES = ['stage1_calibration', 'original_restoration', 'decoding', 'other_modification', 'not_sure'] as const;
const SERVICE_LABELS: Record<string, string> = {
  stage1_calibration: 'Stage 1 calibration',
  original_restoration: 'Original file restoration',
  decoding: 'Decoding (DPF, AdBlue, etc.)',
  other_modification: 'Other supported modification',
  not_sure: 'Not sure',
};
const CUSTOMER_TYPES = ['individual', 'workshop'] as const;
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Other'] as const;
const STORAGE_NAME = /^[A-Za-z0-9._-]{1,120}$/;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
const DRAFT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const INVALID = 'Some details are missing or invalid. Please check the form and try again.';

type AccountStatus = 'signed_in' | 'created' | 'invited' | 'exists' | 'unavailable';

interface UploadedFile {
  storageName: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

function parseFiles(value: unknown): UploadedFile[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_FILES) return null;
  const files: UploadedFile[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const record = item as Record<string, unknown>;
    const originalName = text(record.originalName, 200);
    if (typeof record.storageName !== 'string' || !STORAGE_NAME.test(record.storageName)) return null;
    if (!originalName || typeof record.sizeBytes !== 'number' || record.sizeBytes < 0) return null;
    files.push({
      storageName: record.storageName,
      originalName,
      sizeBytes: Math.round(record.sizeBytes),
      mimeType: typeof record.mimeType === 'string' && record.mimeType ? record.mimeType.slice(0, 120) : 'application/octet-stream',
    });
  }
  return new Set(files.map((f) => f.storageName)).size === files.length ? files : null;
}

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const body = await readJson(req);
    if (!body) return json(req, { error: INVALID }, 400);
    if (typeof body.website === 'string' && body.website.trim() !== '') {
      return json(req, { error: 'The submission could not be processed.' }, 400);
    }

    const admin = adminClient();
    const caller = await getCaller(admin, req);
    if (caller && !caller.isActive) return json(req, { error: 'This account is disabled. Please contact us.' }, 403);

    const ip = clientIp(req);
    const limited = caller
      ? await isRateLimited(admin, `submit:user:${caller.user.id}`, 30, 3600)
      : await isRateLimited(admin, `submit:ip:${ip}`, 8, 3600);
    if (limited) return json(req, { error: 'You have sent several submissions recently. Please try again later.' }, 429);

    const draftId = typeof body.draftId === 'string' ? body.draftId : '';
    const files = parseFiles(body.files);
    const vehicle = (body.vehicle ?? {}) as Record<string, unknown>;
    const ecu = (body.ecu ?? {}) as Record<string, unknown>;
    const customer = (body.customer ?? {}) as Record<string, unknown>;

    const fileType = oneOf(body.fileType, FILE_TYPES);
    const requestedService = oneOf(body.requestedService, SERVICES);
    const customerType = caller?.role === 'partner' ? 'workshop' : oneOf(customer.customerType, CUSTOMER_TYPES);
    const fuelType = oneOf(vehicle.fuelType, FUEL_TYPES);
    const email = (caller?.user.email ?? (typeof customer.email === 'string' ? customer.email : '')).trim().toLowerCase();
    const year = Number(vehicle.year);
    const currentYear = new Date().getFullYear();
    const make = text(vehicle.make, 60);
    const model = text(vehicle.model, 60);
    const engine = text(vehicle.engine, 80);
    const vin = typeof vehicle.vin === 'string' ? vehicle.vin.trim().toUpperCase() : '';
    const manufacturer = optionalText(ecu.manufacturer, 80);
    const hardwareNumber = optionalText(ecu.hardwareNumber, 80);
    const softwareNumber = optionalText(ecu.softwareNumber, 80);
    const identificationNumbers = optionalText(ecu.identificationNumbers, 300);
    const firstName = text(customer.firstName, 80);
    const lastName = text(customer.lastName, 80);
    const country = text(customer.country, 80);
    const companyName = optionalText(customer.companyName, 120);
    const phone = optionalText(customer.phone, 30);
    const comments = optionalText(body.serviceComments, 1000);
    const password = !caller && typeof body.password === 'string' && body.password !== '' ? body.password : null;

    const invalid =
      !DRAFT_ID.test(draftId) || !files || !fileType || !requestedService || !customerType || !fuelType ||
      !make || !model || !engine || !VIN.test(vin) ||
      !Number.isInteger(year) || year < 1950 || year > currentYear + 1 ||
      manufacturer === undefined || hardwareNumber === undefined || softwareNumber === undefined ||
      identificationNumbers === undefined || companyName === undefined || phone === undefined || comments === undefined ||
      !firstName || !lastName || !EMAIL.test(email) || email.length > 254 || !country ||
      (customerType === 'workshop' && !companyName) ||
      body.privacyConsent !== true ||
      (password !== null && (password.length < 8 || password.length > 72));
    if (invalid) return json(req, { error: INVALID }, 400);

    const { data: pendingList, error: listError } = await admin.storage.from(BUCKET).list(`pending/${draftId}`, { limit: 100 });
    if (listError) throw listError;
    const received = new Set((pendingList ?? []).map((item) => item.name));
    if (!files.every((file) => received.has(file.storageName))) {
      return json(req, { error: 'Some files did not finish uploading. Please upload them again.' }, 400);
    }

    const { data: job, error: jobError } = await admin
      .from('jobs')
      .insert({
        user_id: caller?.user.id ?? null,
        file_type: fileType,
        requested_service: requestedService,
        service_comments: comments,
        customer_type: customerType,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: email,
        customer_country: country,
        customer_phone: phone,
        company_name: customerType === 'workshop' ? companyName : null,
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
      .select('id, reference')
      .single();
    if (jobError) throw jobError;

    for (const file of files) {
      const { error: moveError } = await admin.storage
        .from(BUCKET)
        .move(`pending/${draftId}/${file.storageName}`, `${job.reference}/original/${file.storageName}`);
      if (moveError) throw moveError;
    }

    const { error: filesError } = await admin.from('job_files').insert(
      files.map((file) => ({
        job_id: job.id,
        kind: 'original',
        file_name: file.originalName,
        storage_path: `${job.reference}/original/${file.storageName}`,
        size_bytes: file.sizeBytes,
        mime_type: file.mimeType,
      })),
    );
    if (filesError) throw filesError;

    const profileDetails = {
      full_name: `${firstName} ${lastName}`,
      company_name: customerType === 'workshop' ? companyName : null,
      customer_type: customerType,
      country,
      phone,
    };

    let accountStatus: AccountStatus;
    if (caller) {
      accountStatus = 'signed_in';
      await fillMissingProfile(admin, caller.user.id, profileDetails);
    } else {
      accountStatus = await attachAccount(admin, job.id, email, password, profileDetails);
    }

    await logEvent(admin, job.id, caller?.user.id ?? null, 'submitted', { files: files.length, account: accountStatus });

    const vehicleLine = `${year} ${make} ${model} · ${engine} · ${fuelType}`;
    const serviceLine = `${fileType} · ${SERVICE_LABELS[requestedService]}`;

    await Promise.all([
      sendEmail({
        to: email,
        subject: `We received your file · ${job.reference}`,
        heading: 'Your file has been submitted',
        paragraphs: [
          `Hello ${firstName},`,
          'Thank you for your submission. Every file is reviewed individually. We will send you a quotation, or ask for more information, after the technical review.',
          accountStatus === 'invited'
            ? 'We have also sent you a separate email with a link to open your account, where you can follow this job.'
            : 'You can follow this job, send us messages and download your file from your account.',
        ],
        details: [
          ['Job reference', job.reference],
          ['Service', serviceLine],
          ['Vehicle', vehicleLine],
          ['Files', files.map((f) => f.originalName).join(', ')],
        ],
        button: { label: 'View your job', url: jobUrl(job.reference) },
        footnote: `Keep your job reference ${job.reference} for all future messages. To sign in later, use "Email me a login link" at ${siteUrl()}/login.`,
      }),
      sendEmail({
        to: await notificationEmail(admin),
        replyTo: email,
        subject: `New submission ${job.reference} · ${serviceLine}`,
        heading: `New submission ${job.reference}`,
        paragraphs: ['A new file has been submitted and is waiting for review.'],
        details: [
          ['Customer', `${firstName} ${lastName}${companyName && customerType === 'workshop' ? ` · ${companyName}` : ''}`],
          ['Email', email],
          ['Account', caller ? caller.role : accountStatus],
          ['Service', serviceLine],
          ['Vehicle', vehicleLine],
          ['VIN', vin],
          ['Files', `${files.length}`],
          ...(comments ? [['Comments', comments] as [string, string]] : []),
        ],
        button: { label: 'Open in admin', url: adminJobUrl(job.reference) },
      }),
    ]);

    return json(req, { reference: job.reference, accountStatus });
  } catch (error) {
    console.error('submit-job failed', error);
    return json(req, { error: 'We could not complete your submission. Please try again in a moment.' }, 500);
  }
});

type ProfileDetails = {
  full_name: string;
  company_name: string | null;
  customer_type: string;
  country: string;
  phone: string | null;
};

/** Guests are never forced to register: link to an existing account, or create one. */
async function attachAccount(
  admin: AdminClient,
  jobId: string,
  email: string,
  password: string | null,
  details: ProfileDetails,
): Promise<AccountStatus> {
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  if (existing) {
    await admin.from('jobs').update({ user_id: existing.id }).eq('id', jobId);
    await fillMissingProfile(admin, existing.id, details);
    return 'exists';
  }

  let userId: string | null = null;
  let status: AccountStatus = 'unavailable';
  if (password) {
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: details.full_name },
    });
    if (error) console.error('createUser failed', error.message);
    userId = data?.user?.id ?? null;
    status = userId ? 'created' : 'unavailable';
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/dashboard`,
      data: { full_name: details.full_name },
    });
    if (error) console.error('inviteUserByEmail failed', error.message);
    userId = data?.user?.id ?? null;
    status = userId ? 'invited' : 'unavailable';
  }

  if (userId) {
    await admin.from('jobs').update({ user_id: userId }).eq('id', jobId);
    await admin.from('profiles').upsert({ id: userId, email, ...details });
  }
  return status;
}

/** Fills profile fields that are still empty, never overwrites what the customer saved. */
async function fillMissingProfile(admin: AdminClient, userId: string, details: ProfileDetails) {
  const { data: profile } = await admin
    .from('profiles')
    .select('full_name, company_name, customer_type, country, phone')
    .eq('id', userId)
    .maybeSingle();
  if (!profile) return;
  const patch: Record<string, string> = {};
  for (const [key, value] of Object.entries(details)) {
    if (value && !(profile as Record<string, unknown>)[key]) patch[key] = value;
  }
  if (Object.keys(patch).length > 0) await admin.from('profiles').update(patch).eq('id', userId);
}
