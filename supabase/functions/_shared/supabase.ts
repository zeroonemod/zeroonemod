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
  return {
    user: data.user,
    role: (profile?.role as Caller['role']) ?? 'customer',
    isActive: profile?.is_active ?? true,
  };
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

export async function notificationEmail(admin: AdminClient): Promise<string> {
  const { data } = await admin.from('admin_settings').select('notification_email').eq('id', true).maybeSingle();
  return data?.notification_email || Deno.env.get('NOTIFICATION_EMAIL') || 'info@zeroonemod.com';
}

export async function logEvent(admin: AdminClient, jobId: string, actorId: string | null, action: string, details: Record<string, unknown> = {}) {
  const { error } = await admin.from('job_events').insert({ job_id: jobId, actor_id: actorId, action, details });
  if (error) console.error('log event failed', error.message);
}
