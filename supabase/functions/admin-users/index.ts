// Admin-only account management that needs the service role:
// invite or create partner accounts, enable or disable accounts, and process GDPR deletion.
import { EMAIL, json, optionalText, preflight, readJson, siteUrl, text } from '../_shared/http.ts';
import { adminClient, type AdminClient, getCaller } from '../_shared/supabase.ts';

const BUCKET = 'job-files';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

Deno.serve(async (req) => {
  const early = preflight(req);
  if (early) return early;
  if (req.method !== 'POST') return json(req, { error: 'Method not allowed' }, 405);

  try {
    const admin = adminClient();
    const caller = await getCaller(admin, req);
    if (!caller || caller.role !== 'admin' || !caller.isActive) return json(req, { error: 'Not authorized' }, 403);

    const body = await readJson(req);
    if (!body) return json(req, { error: 'Invalid request' }, 400);

    switch (body.action) {
      case 'invite_partner':
        return json(req, await invitePartner(admin, body));
      case 'set_active':
        return json(req, await setActive(admin, body, caller.user.id));
      case 'delete_customer_data':
        return json(req, await deleteCustomerData(admin, body, caller.user.id));
      default:
        return json(req, { error: 'Unknown action' }, 400);
    }
  } catch (error) {
    console.error('admin-users failed', error);
    const message = error instanceof Error ? error.message : 'Request failed';
    return json(req, { error: message }, 400);
  }
});

async function invitePartner(admin: AdminClient, body: Record<string, unknown>) {
  const email = text(body.email, 254)?.toLowerCase();
  const fullName = text(body.fullName, 160);
  const companyName = text(body.companyName, 120);
  const country = optionalText(body.country, 80);
  const phone = optionalText(body.phone, 30);
  const requestId = typeof body.requestId === 'string' && UUID.test(body.requestId) ? body.requestId : null;
  if (!email || !EMAIL.test(email) || !fullName || !companyName || country === undefined || phone === undefined) {
    throw new Error('Enter a valid email, contact name and company name.');
  }

  const details = { full_name: fullName, company_name: companyName, customer_type: 'workshop', country, phone, role: 'partner', is_active: true };
  const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
  let userId = existing?.id as string | undefined;
  let invited = false;

  if (userId) {
    // Existing customer becomes a partner. They keep their password and job history.
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role: 'partner' }, ban_duration: 'none' });
  } else {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      redirectTo: `${siteUrl()}/dashboard/profile`,
      data: { full_name: fullName },
    });
    if (error || !data.user) throw new Error(error?.message ?? 'The invitation could not be sent.');
    userId = data.user.id;
    invited = true;
    await admin.auth.admin.updateUserById(userId, { app_metadata: { role: 'partner' } });
  }

  const { error: profileError } = await admin.from('profiles').upsert({ id: userId, email, ...details });
  if (profileError) throw profileError;

  if (requestId) {
    await admin.from('partner_requests').update({ status: 'approved', reviewed_at: new Date().toISOString(), user_id: userId }).eq('id', requestId);
  }
  return { ok: true, userId, invited };
}

async function setActive(admin: AdminClient, body: Record<string, unknown>, callerId: string) {
  const userId = typeof body.userId === 'string' && UUID.test(body.userId) ? body.userId : null;
  if (!userId || typeof body.active !== 'boolean') throw new Error('Invalid request');
  if (userId === callerId) throw new Error('You cannot disable your own account.');

  const { error } = await admin.auth.admin.updateUserById(userId, { ban_duration: body.active ? 'none' : '876000h' });
  if (error) throw error;
  const { error: profileError } = await admin.from('profiles').update({ is_active: body.active }).eq('id', userId);
  if (profileError) throw profileError;
  return { ok: true };
}

/**
 * GDPR erasure: deletes the customer's files and login, and anonymises their job records.
 * Payment amounts and dates are kept because accounting law may require them.
 */
async function deleteCustomerData(admin: AdminClient, body: Record<string, unknown>, callerId: string) {
  const userId = typeof body.userId === 'string' && UUID.test(body.userId) ? body.userId : null;
  const requestId = typeof body.requestId === 'string' && UUID.test(body.requestId) ? body.requestId : null;
  if (!userId) throw new Error('Invalid request');
  if (userId === callerId) throw new Error('You cannot delete your own account here.');

  const { data: jobs, error: jobsError } = await admin.from('jobs').select('id').eq('user_id', userId);
  if (jobsError) throw jobsError;
  const jobIds = (jobs ?? []).map((job) => job.id as string);

  if (jobIds.length > 0) {
    const { data: files } = await admin.from('job_files').select('storage_path').in('job_id', jobIds);
    const paths = (files ?? []).map((file) => file.storage_path as string);
    for (let i = 0; i < paths.length; i += 100) {
      const { error } = await admin.storage.from(BUCKET).remove(paths.slice(i, i + 100));
      if (error) throw error;
    }
    await admin.from('job_files').delete().in('job_id', jobIds);
    await admin.from('job_messages').delete().in('job_id', jobIds);
    const { error: anonymiseError } = await admin
      .from('jobs')
      .update({
        customer_first_name: 'Deleted',
        customer_last_name: 'customer',
        customer_email: 'deleted@invalid',
        customer_phone: null,
        company_name: null,
        vehicle_vin: 'DELETED',
        service_comments: null,
        ecu_identification_numbers: null,
        files_deleted_at: new Date().toISOString(),
      })
      .in('id', jobIds);
    if (anonymiseError) throw anonymiseError;
    await admin.from('job_events').insert(jobIds.map((id) => ({ job_id: id, actor_id: callerId, action: 'customer_data_deleted', details: {} })));
  }

  const { error: deleteError } = await admin.auth.admin.deleteUser(userId);
  if (deleteError) throw deleteError;

  if (requestId) {
    await admin.from('data_deletion_requests').update({ status: 'completed', processed_at: new Date().toISOString() }).eq('id', requestId);
  }
  return { ok: true, jobs: jobIds.length };
}
