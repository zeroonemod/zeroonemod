const SITE_URL = Deno.env.get('SITE_URL') ?? 'https://zeroonemod.com';

function allowedOrigin(origin: string | null): string {
  if (!origin) return SITE_URL;
  const site = new URL(SITE_URL);
  try {
    const url = new URL(origin);
    const sameSite = url.hostname === site.hostname || url.hostname === `www.${site.hostname}`;
    const local = url.hostname === 'localhost' || url.hostname === '127.0.0.1';
    const preview = url.hostname.endsWith('.vercel.app');
    return sameSite || local || preview ? origin : SITE_URL;
  } catch {
    return SITE_URL;
  }
}

export function corsHeaders(req: Request): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': allowedOrigin(req.headers.get('Origin')),
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-cron-secret',
    Vary: 'Origin',
  };
}

export function json(req: Request, body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders(req), 'Content-Type': 'application/json' },
  });
}

export function preflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response(null, { status: 204, headers: corsHeaders(req) }) : null;
}

export function clientIp(req: Request): string {
  return (req.headers.get('x-forwarded-for') ?? '').split(',')[0].trim() || req.headers.get('cf-connecting-ip') || 'unknown';
}

export async function readJson(req: Request): Promise<Record<string, unknown> | null> {
  const body = await req.json().catch(() => null);
  return body && typeof body === 'object' && !Array.isArray(body) ? (body as Record<string, unknown>) : null;
}

export const text = (value: unknown, max: number): string | null => {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= max ? trimmed : null;
};

/** Empty is fine (null). Too long or wrong type returns undefined so callers can reject it. */
export const optionalText = (value: unknown, max: number): string | null | undefined => {
  if (value === undefined || value === null || value === '') return null;
  return text(value, max) ?? undefined;
};

export const oneOf = <T extends string>(value: unknown, options: readonly T[]): T | null =>
  typeof value === 'string' && (options as readonly string[]).includes(value) ? (value as T) : null;

export const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export function siteUrl(): string {
  return SITE_URL.replace(/\/$/, '');
}
