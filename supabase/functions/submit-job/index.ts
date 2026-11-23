// Creates a job from the submission wizard for signed-in customers and partners, and for visitors
// who choose the account path (an account is created or linked at submission).
// Files are uploaded by the browser into pending/<draftId>/ first, then moved into <reference>/original/
// (and hardware photos into <reference>/photos/).
import { clientIp, EMAIL, json, oneOf, optionalText, preflight, readJson, siteUrl, text } from '../_shared/http.ts';
import { adminClient, type AdminClient, getCaller, isRateLimited, logEvent, notificationEmail } from '../_shared/supabase.ts';
import { adminJobUrl, jobUrl, sendEmail } from '../_shared/email.ts';
import { attachOriginals, DRAFT_ID, parseFiles, pendingFilesPresent } from '../_shared/files.ts';
import { attachPhotos, parseJobDetails, parsePhotos, vehicleSummary } from '../_shared/jobDetails.ts';

const CUSTOMER_TYPES = ['individual', 'workshop'] as const;
const INVALID = 'Some details are missing or invalid. Please check the form and try again.';

type AccountStatus = 'signed_in' | 'created' | 'invited' | 'exists' | 'unavailable';

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
    const photos = parsePhotos(body.photos);
    const details = parseJobDetails(body);
    const customer = (body.customer ?? {}) as Record<string, unknown>;

    const customerType = caller?.role === 'partner' ? 'workshop' : oneOf(customer.customerType, CUSTOMER_TYPES);
    const email = (caller?.user.email ?? (typeof customer.email === 'string' ? customer.email : '')).trim().toLowerCase();
    const firstName = text(customer.firstName, 80);
    const lastName = text(customer.lastName, 80);
    const country = text(customer.country, 80);
    const companyName = optionalText(customer.companyName, 120);
    const phone = optionalText(customer.phone, 30);
    const password = !caller && typeof body.password === 'string' && body.password !== '' ? body.password : null;

    const invalid =
      !DRAFT_ID.test(draftId) || !files || !photos || !details || !customerType ||
      companyName === undefined || phone === undefined ||
      !firstName || !lastName || !EMAIL.test(email) || email.length > 254 || !country ||
      (customerType === 'workshop' && !companyName) ||
      body.privacyConsent !== true ||
      (password !== null && (password.length < 8 || password.length > 72));
    if (invalid || !files || !photos || !details) return json(req, { error: INVALID }, 400);

    if (!(await pendingFilesPresent(admin, draftId, [...files, ...photos]))) {
      return json(req, { error: 'Some files did not finish uploading. Please upload them again.' }, 400);
    }

    const { data: job, error: jobError } = await admin
      .from('jobs')
      .insert({
        user_id: caller?.user.id ?? null,
        ...details,
        customer_type: customerType,
        customer_first_name: firstName,
        customer_last_name: lastName,
        customer_email: email,
        customer_country: country,
        customer_phone: phone,
        company_name: customerType === 'workshop' ? companyName : null,
        privacy_consent_at: new Date().toISOString(),
      })
      .select('id, reference')
      .single();
    if (jobError) throw jobError;

    await attachOriginals(admin, job.id, job.reference, draftId, files);
    await attachPhotos(admin, job.id, job.reference, draftId, photos);

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

    await logEvent(admin, job.id, caller?.user.id ?? null, 'submitted', { files: files.length, photos: photos.length, account: accountStatus });

    const summary = vehicleSummary(details);
    const serviceLine = summary[0][1];

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
        details: [['Job reference', job.reference], summary[0], summary[1], ['Files', files.map((f) => f.originalName).join(', ')]],
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
          ...summary,
          ['Files', `${files.length}${photos.length ? ` + ${photos.length} photo(s)` : ''}`],
          ...(details.service_comments ? [['Comments', details.service_comments] as [string, string]] : []),
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
