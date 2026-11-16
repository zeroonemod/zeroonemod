// File retention. Run daily by Supabase Cron (with the x-cron-secret header) or on demand by the admin.
// 1. Removes uploads from submissions that were started but never sent (older than 24 hours).
// 2. When auto-delete is on, removes job files older than the retention period in Settings.
import { json, preflight } from '../_shared/http.ts';
import { adminClient, type AdminClient, getCaller } from '../_shared/supabase.ts';

const BUCKET = 'job-files';

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const admin = adminClient();
    const cronSecret = Deno.env.get('CRON_SECRET');
    const fromCron = Boolean(cronSecret) && req.headers.get('x-cron-secret') === cronSecret;
    const caller = fromCron ? null : await getCaller(admin, req);
    if (!fromCron && (!caller || caller.role !== 'admin')) return json(req, { error: 'Not authorized' }, 403);

    const pendingRemoved = await removeStalePending(admin);
    const jobs = await applyRetention(admin, caller?.user.id ?? null);
    return json(req, { ok: true, pendingRemoved, jobsCleaned: jobs });
  } catch (error) {
    console.error('retention-cleanup failed', error);
    return json(req, { error: 'Cleanup failed' }, 500);
  }
});

async function removeStalePending(admin: AdminClient): Promise<number> {
  const { data, error } = await admin.rpc('stale_pending_objects', { p_older_than_hours: 24 });
  if (error) throw error;
  const names = ((data ?? []) as { name: string }[]).map((row) => row.name);
  for (let i = 0; i < names.length; i += 100) {
    const { error: removeError } = await admin.storage.from(BUCKET).remove(names.slice(i, i + 100));
    if (removeError) throw removeError;
  }
  return names.length;
}

async function applyRetention(admin: AdminClient, actorId: string | null): Promise<number> {
  const { data: settings } = await admin.from('admin_settings').select('retention_days, auto_delete_enabled').eq('id', true).maybeSingle();
  if (!settings?.auto_delete_enabled) return 0;

  const cutoff = new Date(Date.now() - settings.retention_days * 86_400_000).toISOString();
  const { data: jobs, error } = await admin
    .from('jobs')
    .select('id')
    .is('files_deleted_at', null)
    .lt('created_at', cutoff)
    .limit(200);
  if (error) throw error;

  let cleaned = 0;
  for (const job of jobs ?? []) {
    const { data: files } = await admin.from('job_files').select('storage_path').eq('job_id', job.id);
    const paths = (files ?? []).map((file) => file.storage_path as string);
    if (paths.length > 0) {
      const { error: removeError } = await admin.storage.from(BUCKET).remove(paths);
      if (removeError) {
        console.error('remove failed for job', job.id, removeError.message);
        continue;
      }
      await admin.from('job_files').delete().eq('job_id', job.id);
    }
    await admin.from('jobs').update({ files_deleted_at: new Date().toISOString() }).eq('id', job.id);
    await admin.from('job_events').insert({
      job_id: job.id,
      actor_id: actorId,
      action: 'files_deleted',
      details: { count: paths.length, reason: 'retention', retention_days: settings.retention_days },
    });
    cleaned += 1;
  }
  return cleaned;
}
