import { siteUrl } from './http.ts';

const RESEND_URL = 'https://api.resend.com/emails';

export interface EmailContent {
  subject: string;
  heading: string;
  paragraphs: string[];
  details?: [string, string][];
  button?: { label: string; url: string };
  footnote?: string;
}

export interface EmailMessage extends EmailContent {
  to: string;
  replyTo?: string;
  /** Sender address, for example billing@zeroonemod.com. Default: EMAIL_FROM. */
  fromAddress?: string;
}

export function emailEnabled(): boolean {
  return Boolean(Deno.env.get('RESEND_API_KEY'));
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');

const paragraphHtml = (value: string) => escapeHtml(value).replace(/\n/g, '<br>');

/** Clean black and white layout with a single red button. Works in all major mail clients. */
export function renderEmail(content: EmailContent): { html: string; text: string } {
  const site = siteUrl();
  const details = content.details?.length
    ? `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:24px 0;border-top:1px solid #e5e5e5;">
        ${content.details
          .map(
            ([label, value]) => `<tr>
              <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:12px;letter-spacing:0.08em;text-transform:uppercase;color:#737373;width:40%;vertical-align:top;">${escapeHtml(label)}</td>
              <td style="padding:10px 0;border-bottom:1px solid #e5e5e5;font-size:14px;color:#0a0a0a;vertical-align:top;word-break:break-word;">${paragraphHtml(value)}</td>
            </tr>`,
          )
          .join('')}
      </table>`
    : '';
  const button = content.button
    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin:28px 0 8px;"><tr>
        <td style="background:#E11D2E;border-radius:8px;">
          <a href="${escapeHtml(content.button.url)}" style="display:inline-block;padding:14px 26px;font-size:13px;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:#ffffff;text-decoration:none;">${escapeHtml(content.button.label)}</a>
        </td></tr></table>`
    : '';

  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(content.subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f4f4;font-family:Inter,Helvetica,Arial,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f4;padding:32px 12px;">
    <tr><td align="center">
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border:1px solid #e5e5e5;border-radius:12px;overflow:hidden;">
        <tr><td style="background:#0a0a0a;padding:22px 28px;border-bottom:2px solid #E11D2E;">
          <img src="${site}/logo.png" alt="ZEROONEMOD" width="160" height="20" style="display:block;height:20px;width:auto;border:0;">
        </td></tr>
        <tr><td style="padding:32px 28px 28px;color:#0a0a0a;">
          <h1 style="margin:0 0 16px;font-size:22px;line-height:1.3;font-weight:700;color:#0a0a0a;">${escapeHtml(content.heading)}</h1>
          ${content.paragraphs.map((p) => `<p style="margin:0 0 14px;font-size:15px;line-height:1.6;color:#262626;">${paragraphHtml(p)}</p>`).join('')}
          ${details}
          ${button}
          ${content.footnote ? `<p style="margin:20px 0 0;font-size:12px;line-height:1.6;color:#737373;">${paragraphHtml(content.footnote)}</p>` : ''}
        </td></tr>
        <tr><td style="padding:20px 28px;border-top:1px solid #e5e5e5;font-size:12px;line-height:1.6;color:#737373;">
          ZEROONEMOD · ECU &amp; TCU File Services<br>
          <a href="${site}" style="color:#737373;">${escapeHtml(site.replace(/^https?:\/\//, ''))}</a> · info@zeroonemod.com
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;

  const text = [
    content.heading,
    '',
    ...content.paragraphs,
    ...(content.details ?? []).map(([label, value]) => `${label}: ${value}`),
    content.button ? `\n${content.button.label}: ${content.button.url}` : '',
    content.footnote ?? '',
    '\nZEROONEMOD · ECU & TCU File Services',
  ].join('\n');

  return { html, text };
}

/** Sends through Resend. Without RESEND_API_KEY it logs and returns false, so flows never break. */
export async function sendEmail(message: EmailMessage): Promise<boolean> {
  const apiKey = Deno.env.get('RESEND_API_KEY');
  if (!apiKey) {
    console.log(`email skipped (RESEND_API_KEY not set): "${message.subject}"`);
    return false;
  }
  const { html, text } = renderEmail(message);
  try {
    const response = await fetch(RESEND_URL, {
      method: 'POST',
      headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({
        from: message.fromAddress ? `ZEROONEMOD <${message.fromAddress}>` : Deno.env.get('EMAIL_FROM') ?? 'ZEROONEMOD <info@zeroonemod.com>',
        to: [message.to],
        reply_to: message.replyTo ?? message.fromAddress ?? 'info@zeroonemod.com',
        subject: message.subject,
        html,
        text,
      }),
    });
    if (!response.ok) {
      console.error('resend failed', response.status, await response.text());
      return false;
    }
    return true;
  } catch (error) {
    console.error('resend error', error);
    return false;
  }
}

export function jobUrl(reference: string): string {
  return `${siteUrl()}/dashboard/jobs/${encodeURIComponent(reference)}`;
}

export function adminJobUrl(reference: string): string {
  return `${siteUrl()}/admin/jobs/${encodeURIComponent(reference)}`;
}

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount);
}
