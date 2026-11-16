// Contact form and partner access requests. A partner request never grants access: it waits for admin review.
import { clientIp, EMAIL, json, optionalText, preflight, readJson, siteUrl, text } from '../_shared/http.ts';
import { adminClient, isRateLimited, notificationEmail } from '../_shared/supabase.ts';
import { sendEmail } from '../_shared/email.ts';

const INVALID = 'Some details are missing or invalid. Please check the form and try again.';
const LIMITED = 'You have sent several requests recently. Please try again later.';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const body = await readJson(req);
    if (!body) return json(req, { error: INVALID }, 400);
    // Honeypot: pretend success so bots learn nothing.
    if (typeof body.website === 'string' && body.website.trim() !== '') return json(req, { ok: true });

    const email = text(body.email, 254)?.toLowerCase() ?? null;
    if (!email || !EMAIL.test(email) || body.consent !== true) return json(req, { error: INVALID }, 400);

    const admin = adminClient();
    const kind = body.kind === 'contact' || body.kind === 'partner' ? body.kind : null;
    if (!kind) return json(req, { error: INVALID }, 400);

    const ip = clientIp(req);
    if (
      (await isRateLimited(admin, `${kind}:ip:${ip}`, 10, 3600)) ||
      (await isRateLimited(admin, `${kind}:email:${email}`, 5, 3600))
    ) {
      return json(req, { error: LIMITED }, 429);
    }

    const consentAt = new Date().toISOString();
    const to = await notificationEmail(admin);

    if (kind === 'contact') {
      const name = text(body.name, 120);
      const subject = text(body.subject, 150);
      const message = text(body.message, 2000);
      if (!name || !subject || !message) return json(req, { error: INVALID }, 400);

      const { error } = await admin.from('contact_messages').insert({ name, email, subject, message, consent_at: consentAt });
      if (error) throw error;
      await sendEmail({
        to,
        replyTo: email,
        subject: `Contact form: ${subject}`,
        heading: 'New contact message',
        paragraphs: [message],
        details: [
          ['Name', name],
          ['Email', email],
        ],
        button: { label: 'Open messages', url: `${siteUrl()}/admin/messages` },
      });
      return json(req, { ok: true });
    }

    const companyName = text(body.companyName, 120);
    const contactName = text(body.contactName, 120);
    const country = text(body.country, 80);
    const phone = optionalText(body.phone, 30);
    const message = optionalText(body.message, 2000);
    if (!companyName || !contactName || !country || phone === undefined || message === undefined) {
      return json(req, { error: INVALID }, 400);
    }

    const { error } = await admin.from('partner_requests').insert({
      company_name: companyName,
      contact_name: contactName,
      email,
      phone,
      country,
      message,
      consent_at: consentAt,
    });
    if (error) throw error;
    await sendEmail({
      to,
      replyTo: email,
      subject: `Partner request: ${companyName}`,
      heading: 'New partner access request',
      paragraphs: ['A business has requested partner access. Review it in the admin panel. No access has been granted.'],
      details: [
        ['Company', companyName],
        ['Contact', contactName],
        ['Email', email],
        ['Phone', phone ?? '-'],
        ['Country', country],
        ...(message ? [['Message', message] as [string, string]] : []),
      ],
      button: { label: 'Review request', url: `${siteUrl()}/admin/partners` },
    });
    return json(req, { ok: true });
  } catch (error) {
    console.error('submit-request failed', error);
    return json(req, { error: 'We could not send your request. Please try again in a moment.' }, 500);
  }
});
