// Sends job emails after an action in the dashboard or admin panel.
// The email is built from the database, never from text sent by the browser,
// and each event is limited to the people allowed to trigger it.
import { json, preflight, readJson } from '../_shared/http.ts';
import { adminClient, getCaller, isRateLimited, notificationEmail } from '../_shared/supabase.ts';
import { adminJobUrl, type EmailMessage, formatMoney, jobUrl, sendEmail } from '../_shared/email.ts';

const ADMIN_EVENTS = ['status_changed', 'quotation_sent', 'payment_link', 'delivered', 'admin_message', 'download_link'] as const;
const DOWNLOAD_LINK_DAYS = 7;
const CUSTOMER_EVENTS = ['customer_message', 'additional_files'] as const;
type NotifyEvent = (typeof ADMIN_EVENTS)[number] | (typeof CUSTOMER_EVENTS)[number];

const STATUS_TEXT: Record<string, string> = {
  Submitted: 'Your file has been received and is waiting for review.',
  'Under Review': 'Our team is reviewing your file and the requested service.',
  'Awaiting Information': 'We need a little more information to continue. Please check the messages on your job and upload any extra files there.',
  'Quotation Sent': 'Your quotation is ready in your account.',
  'Awaiting Payment': 'Your quotation is ready. Complete the payment from your account so we can release your file.',
  'In Progress': 'Your file is being modified.',
  Completed: 'Your file has been completed and is being prepared for delivery.',
  Delivered: 'Your modified file is ready to download from your account.',
};

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const body = await readJson(req);
    const event = body?.event as NotifyEvent | undefined;
    const jobId = typeof body?.jobId === 'string' ? body.jobId : '';
    if (!event || ![...ADMIN_EVENTS, ...CUSTOMER_EVENTS].includes(event) || !/^[0-9a-f-]{36}$/i.test(jobId)) {
      return json(req, { error: 'Invalid request' }, 400);
    }

    const admin = adminClient();
    const caller = await getCaller(admin, req);
    if (!caller || !caller.isActive) return json(req, { error: 'Not signed in' }, 401);

    const { data: job } = await admin
      .from('jobs')
      .select('id, reference, user_id, job_type, status, payment_status, customer_email, customer_first_name, customer_last_name, quote_amount, quote_currency, quote_notes, payment_link')
      .eq('id', jobId)
      .maybeSingle();
    if (!job) return json(req, { error: 'Job not found' }, 404);

    const isAdmin = caller.role === 'admin';
    const isOwner = job.user_id === caller.user.id;
    if ((ADMIN_EVENTS as readonly string[]).includes(event) ? !isAdmin : !isOwner) {
      return json(req, { error: 'Not allowed' }, 403);
    }
    if (await isRateLimited(admin, `notify:${caller.user.id}:${event}`, 30, 3600)) {
      return json(req, { sent: false, reason: 'rate_limited' });
    }

    // Guest requests are handled by phone or email directly; they get no automatic job emails.
    if (job.job_type === 'guest') return json(req, { sent: false, reason: 'guest_request' });

    const customerEmail = await customerAddress(admin, job.user_id, job.customer_email);
    const toCustomer = event !== 'customer_message' && event !== 'additional_files';
    if (toCustomer && !customerEmail) return json(req, { sent: false, reason: 'no_email' });
    // Customers without an account have no dashboard: send links that work without logging in.
    const hasAccount = Boolean(job.user_id);
    if (!hasAccount && (event === 'admin_message' || event === 'delivered')) return json(req, { sent: false, reason: 'no_account' });

    const hello = `Hello ${job.customer_first_name ?? ''},`;
    let message: EmailMessage | null = null;

    switch (event) {
      case 'download_link': {
        if (job.payment_status !== 'paid') return json(req, { error: 'Mark the job as paid first.' }, 400);
        const { data: files } = await admin.from('job_files').select('file_name, storage_path').eq('job_id', job.id).eq('kind', 'completed');
        if (!files?.length) return json(req, { error: 'Upload a completed file first.' }, 400);
        const links: [string, string][] = [];
        for (const file of files) {
          const { data, error } = await admin.storage
            .from('job-files')
            .createSignedUrl(file.storage_path, DOWNLOAD_LINK_DAYS * 86_400, { download: file.file_name });
          if (error || !data) throw error ?? new Error('signed url failed');
          links.push([file.file_name, data.signedUrl]);
        }
        message = {
          to: customerEmail!,
          subject: `Your file is ready · ${job.reference}`,
          heading: 'Your modified file is ready',
          paragraphs: [hello, `Your completed file is ready. The secure download link below is valid for ${DOWNLOAD_LINK_DAYS} days.`],
          details: [['Job reference', job.reference], ...links.map(([name]) => ['File', name] as [string, string])],
          button: { label: links.length === 1 ? 'Download your file' : 'Download first file', url: links[0][1] },
          footnote: links.length > 1 ? links.map(([name, url]) => `${name}: ${url}`).join('\n') : undefined,
        };
        const sent = await sendEmail(message);
        if (sent) {
          await admin.from('job_events').insert({ job_id: job.id, actor_id: caller.user.id, action: 'download_link_sent', details: { files: links.length, days: DOWNLOAD_LINK_DAYS } });
        }
        return json(req, { sent });
      }
      case 'status_changed':
        message = {
          to: customerEmail!,
          subject: `${job.reference} · ${job.status}`,
          heading: `Status update: ${job.status}`,
          paragraphs: [hello, STATUS_TEXT[job.status] ?? `Your job status is now ${job.status}.`],
          details: [['Job reference', job.reference], ['Status', job.status]],
          button: hasAccount ? { label: 'View your job', url: jobUrl(job.reference) } : undefined,
        };
        break;
      case 'quotation_sent':
        if (job.quote_amount === null) return json(req, { sent: false });
        message = {
          to: customerEmail!,
          subject: `Your quotation for ${job.reference}`,
          heading: 'Your quotation is ready',
          paragraphs: [
            hello,
            job.payment_link
              ? hasAccount
                ? 'We have reviewed your file. Your quotation and payment link are ready in your account. The modified file is released once payment is complete.'
                : 'We have reviewed your file. Your quotation is below. Use the button to pay; the modified file is released once payment is complete.'
              : 'We have reviewed your file and your quotation is ready. We will send the payment link shortly.',
          ],
          details: [
            ['Job reference', job.reference],
            ['Price', formatMoney(Number(job.quote_amount), job.quote_currency)],
            ...(job.quote_notes ? [['Notes', job.quote_notes] as [string, string]] : []),
          ],
          button: hasAccount
            ? { label: job.payment_link ? 'View and pay' : 'View your job', url: jobUrl(job.reference) }
            : job.payment_link
              ? { label: 'Pay now', url: job.payment_link }
              : undefined,
        };
        break;
      case 'payment_link':
        if (!job.payment_link) return json(req, { sent: false });
        message = {
          to: customerEmail!,
          subject: `Payment link for ${job.reference}`,
          heading: 'Your payment link is ready',
          paragraphs: [
            hello,
            hasAccount
              ? 'You can now complete the payment from your account. The modified file is released once payment is confirmed.'
              : 'You can now complete the payment with the button below. The modified file is released once payment is confirmed.',
          ],
          details: [
            ['Job reference', job.reference],
            ...(job.quote_amount !== null ? [['Price', formatMoney(Number(job.quote_amount), job.quote_currency)] as [string, string]] : []),
          ],
          button: { label: 'Pay now', url: hasAccount ? jobUrl(job.reference) : job.payment_link },
        };
        break;
      case 'delivered':
        message = {
          to: customerEmail!,
          subject: `Your file is ready · ${job.reference}`,
          heading: 'Your modified file is ready',
          paragraphs: [hello, 'Your completed file is now available in your account. Download links are secure and expire after a few minutes, so open the download from your account each time.'],
          details: [['Job reference', job.reference]],
          button: { label: 'Download your file', url: jobUrl(job.reference) },
        };
        break;
      case 'admin_message':
        message = {
          to: customerEmail!,
          subject: `New message about ${job.reference}`,
          heading: 'You have a new message',
          paragraphs: [hello, 'ZEROONEMOD has sent you a message about your job. Open your account to read it and reply.'],
          details: [['Job reference', job.reference]],
          button: { label: 'Read message', url: jobUrl(job.reference) },
        };
        break;
      case 'customer_message':
      case 'additional_files':
        message = {
          to: await notificationEmail(admin),
          replyTo: customerEmail ?? undefined,
          subject: event === 'customer_message' ? `New customer message · ${job.reference}` : `Additional files uploaded · ${job.reference}`,
          heading: event === 'customer_message' ? 'New message from a customer' : 'The customer uploaded additional files',
          paragraphs: [`${job.customer_first_name ?? ''} ${job.customer_last_name ?? ''} (${customerEmail ?? 'no email'})`],
          details: [['Job reference', job.reference], ['Status', job.status]],
          button: { label: 'Open in admin', url: adminJobUrl(job.reference) },
        };
        break;
    }

    const sent = message ? await sendEmail(message) : false;
    return json(req, { sent });
  } catch (error) {
    console.error('notify failed', error);
    return json(req, { error: 'Notification failed' }, 500);
  }
});

async function customerAddress(admin: ReturnType<typeof adminClient>, userId: string | null, fallback: string | null): Promise<string | null> {
  if (!userId) return fallback;
  const { data } = await admin.from('profiles').select('email').eq('id', userId).maybeSingle();
  return data?.email || fallback;
}
