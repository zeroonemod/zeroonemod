// Guest request: files plus an email and/or phone number. No account is created.
import { clientIp, EMAIL, json, optionalText, preflight, readJson, siteUrl } from '../_shared/http.ts';
import { adminClient, isRateLimited, logEvent, notificationEmail } from '../_shared/supabase.ts';
import { attachOriginals, DRAFT_ID, parseFiles, pendingFilesPresent } from '../_shared/files.ts';
import { adminJobUrl, sendEmail } from '../_shared/email.ts';

const PHONE = /^\+?[0-9][0-9 ().-]{4,28}[0-9]$/;
const INVALID = 'Some details are missing or invalid. Please check the form and try again.';

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
    if (await isRateLimited(admin, `guest:ip:${clientIp(req)}`, 6, 3600)) {
      return json(req, { error: 'You have sent several files recently. Please try again later.' }, 429);
    }

    const draftId = typeof body.draftId === 'string' ? body.draftId : '';
    const files = parseFiles(body.files);
    const emailRaw = optionalText(body.email, 254);
    const phoneRaw = optionalText(body.phone, 30);
    const notes = optionalText(body.notes, 1000);
    const email = emailRaw ? emailRaw.toLowerCase() : emailRaw;
    const digits = (phoneRaw ?? '').replace(/\D/g, '');

    const invalid =
      !DRAFT_ID.test(draftId) || !files || email === undefined || phoneRaw === undefined || notes === undefined ||
      (!email && !phoneRaw) ||
      (email && !EMAIL.test(email)) ||
      (phoneRaw && (!PHONE.test(phoneRaw) || digits.length < 6 || digits.length > 15)) ||
      body.privacyConsent !== true;
    if (invalid) return json(req, { error: INVALID }, 400);

    if (!(await pendingFilesPresent(admin, draftId, files))) {
      return json(req, { error: 'Some files did not finish uploading. Please upload them again.' }, 400);
    }

    const { data: job, error } = await admin
      .from('jobs')
      .insert({
        job_type: 'guest',
        customer_email: email,
        customer_phone: phoneRaw,
        service_comments: notes,
        privacy_consent_at: new Date().toISOString(),
      })
      .select('id, reference')
      .single();
    if (error) throw error;

    await attachOriginals(admin, job.id, job.reference, draftId, files);
    await logEvent(admin, job.id, null, 'guest_submitted', { files: files.length });

    await Promise.all([
      email
        ? sendEmail({
            to: email,
            subject: `We received your file · ${job.reference}`,
            heading: 'Thank you for submitting your file',
            paragraphs: ['We will contact you.'],
            details: [['Reference', job.reference]],
            footnote: `ZEROONEMOD · ${siteUrl().replace(/^https?:\/\//, '')}`,
          })
        : Promise.resolve(false),
      sendEmail({
        to: await notificationEmail(admin),
        replyTo: email ?? undefined,
        subject: `New guest request ${job.reference}`,
        heading: `New guest request ${job.reference}`,
        paragraphs: ['A visitor sent a file without an account. Contact them to continue.'],
        details: [
          ['Email', email ?? '-'],
          ['Phone', phoneRaw ?? '-'],
          ['Files', files.map((f) => f.originalName).join(', ')],
          ...(notes ? [['Notes', notes] as [string, string]] : []),
        ],
        button: { label: 'Open in admin', url: adminJobUrl(job.reference) },
      }),
    ]);

    return json(req, { reference: job.reference });
  } catch (error) {
    console.error('submit-guest failed', error);
    return json(req, { error: 'We could not complete your submission. Please try again in a moment.' }, 500);
  }
});
