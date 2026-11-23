import { createClient, type SupabaseClient, type User } from 'npm:@supabase/supabase-js@2';

export type AdminClient = SupabaseClient;

export function adminClient(): AdminClient {
  return createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export interface Caller {
  user: User;
  role: 'customer' | 'partner' | 'admin';
  isActive: boolean;
}

/** Resolves the signed-in user from the Authorization header, or null for guests. */
export async function getCaller(admin: AdminClient, req: Request): Promise<Caller | null> {
  const token = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '');
  if (!token) return null;
  const { data, error } = await admin.auth.getUser(token);
  if (error || !data.user) return null;
  const { data: profile } = await admin.from('profiles').select('role, is_active').eq('id', data.user.id).maybeSingle();
  let role = (profile?.role as Caller['role']) ?? 'customer';
  // Admin rights also need two-step verification when it is switched on. The database decides
  // (public.is_admin), using the caller's own token so its login level (aal) is taken into account.
  if (role === 'admin' && !(await callerIsAdmin(token))) role = 'customer';
  return {
    user: data.user,
    role,
    isActive: profile?.is_active ?? true,
  };
}

async function callerIsAdmin(token: string): Promise<boolean> {
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  if (!anonKey) return false;
  const asCaller = createClient(Deno.env.get('SUPABASE_URL')!, anonKey, {
    auth: { persistSession: false, autoRefreshToken: false },
    global: { headers: { Authorization: `Bearer ${token}` } },
  });
  const { data, error } = await asCaller.rpc('is_admin');
  if (error) console.error('is_admin check failed', error.message);
  return data === true;
}

/** True when the key has been used more than `max` times in the window. */
export async function isRateLimited(admin: AdminClient, key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await admin.rpc('hit_rate_limit', { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error('rate limit check failed', error.message);
    return false;
  }
  return data === true;
}

export interface EmailAddresses {
  /** Website notifications to the business (new jobs, messages, partner requests). */
  notification: string;
  /** Public contact address: contact form, and where customers reply. */
  support: string;
  /** Quotations, payment links and download links are sent from here. */
  billing: string;
}

/** The three addresses from Admin → Settings → Email addresses. */
export async function emailAddresses(admin: AdminClient): Promise<EmailAddresses> {
  const { data } = await admin.from('admin_settings').select('notification_email, support_email, billing_email').eq('id', true).maybeSingle();
  return {
    notification: data?.notification_email || Deno.env.get('NOTIFICATION_EMAIL') || 'admin@zeroonemod.com',
    support: data?.support_email || 'info@zeroonemod.com',
    billing: data?.billing_email || 'billing@zeroonemod.com',
  };
}

export async function notificationEmail(admin: AdminClient): Promise<string> {
  return (await emailAddresses(admin)).notification;
}

export async function logEvent(admin: AdminClient, jobId: string, actorId: string | null, action: string, details: Record<string, unknown> = {}) {
  const { error } = await admin.from('job_events').insert({ job_id: jobId, actor_id: actorId, action, details });
  if (error) console.error('log event failed', error.message);
}
