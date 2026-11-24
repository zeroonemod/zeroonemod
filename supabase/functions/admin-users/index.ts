// Admin-only account management that needs the service role:
// invite or create partner accounts, enable or disable accounts, convert guest requests
// into customer jobs (optionally with an account), and process GDPR deletion.
import { EMAIL, json, oneOf, optionalText, preflight, readJson, siteUrl, text } from '../_shared/http.ts';
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
      case 'create_staff':
        return json(req, await createStaff(admin, body));
      case 'delete_job':
        return json(req, await deleteJob(admin, body));
      case 'convert_guest':
        return json(req, await convertGuest(admin, body, caller.user.id));
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
/**
 * Permanently deletes one job: its storage files, then the job row. Messages, notes, file records
 * and the activity log go with it (ON DELETE CASCADE). Jobs with a recorded payment are kept for
 * the accounting records.
 */
async function deleteJob(admin: AdminClient, body: Record<string, unknown>) {
  const jobId = typeof body.jobId === 'string' && UUID.test(body.jobId) ? body.jobId : null;
  if (!jobId) throw new Error('Invalid request');

  const { data: job } = await admin.from('jobs').select('id, reference').eq('id', jobId).maybeSingle();
  if (!job) throw new Error('Job not found.');

  const { count, error: paymentError } = await admin.from('payments').select('id', { count: 'exact', head: true }).eq('job_id', jobId);
  if (paymentError) throw paymentError;
  // Paid jobs can be deleted too (tests, mistakes), but only when the admin typed the job reference.
  if ((count ?? 0) > 0 && body.confirmReference !== job.reference) {
    throw new Error(`This job has a recorded payment. Type ${job.reference} to confirm the deletion.`);
  }

  // Remove everything stored under the job's folder, including files no longer listed on the job.
  const paths = new Set<string>();
  const { data: rows } = await admin.from('job_files').select('storage_path').eq('job_id', jobId);
  for (const row of rows ?? []) paths.add(row.storage_path as string);
  for (const folder of ['original', 'additional', 'completed', 'photos']) {
    const { data: listed } = await admin.storage.from(BUCKET).list(`${job.reference}/${folder}`, { limit: 1000 });
    for (const item of listed ?? []) paths.add(`${job.reference}/${folder}/${item.name}`);
  }
  const all = [...paths];
  for (let i = 0; i < all.length; i += 100) {
    const { error } = await admin.storage.from(BUCKET).remove(all.slice(i, i + 100));
    if (error) throw error;
  }

  const { error: deleteError } = await admin.from('jobs').delete().eq('id', jobId);
  if (deleteError) throw deleteError;
  return { ok: true, reference: job.reference, filesRemoved: all.length };
}

/**
 * Staff account with a temporary password chosen by the admin. The staff member must choose
 * their own password at the first login. Access is limited by the database (role 'staff').
 */
async function createStaff(admin: AdminClient, body: Record<string, unknown>) {
  const email = text(body.email, 254)?.toLowerCase();
  const fullName = text(body.fullName, 160);
  const password = typeof body.password === 'string' ? body.password : '';
  if (!email || !EMAIL.test(email) || !fullName) throw new Error('Enter the name and a valid email.');
  if (password.length < 8 || password.length > 72) throw new Error('The temporary password must have 8 to 72 characters.');

  const { data: existing } = await admin.from('profiles').select('id, role').eq('email', email).maybeSingle();
  if (existing) throw new Error(`An account already exists for ${email} (${existing.role}). Use a different email for staff.`);

  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, user_metadata: { full_name: fullName } });
  if (error || !data.user) throw new Error(error?.message ?? 'The staff account could not be created.');
  const { error: profileError } = await admin
    .from('profiles')
    .upsert({ id: data.user.id, email, full_name: fullName, role: 'staff', is_active: true, must_change_password: true });
  if (profileError) throw profileError;
  return { ok: true, userId: data.user.id };
}

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

const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
const SERVICES = ['stage1_calibration', 'original_restoration', 'decoding', 'other_modification', 'not_sure'] as const;
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Other'] as const;

/**
 * Turns a guest request into a normal customer job with the details the admin collected.
 * With createAccount, the job is linked to the existing account for that email or a new
 * account is invited, so the customer can follow the job from the dashboard.
 */
async function convertGuest(admin: AdminClient, body: Record<string, unknown>, callerId: string) {
  const jobId = typeof body.jobId === 'string' && UUID.test(body.jobId) ? body.jobId : null;
  const d = (body.details ?? {}) as Record<string, unknown>;
  const email = (text(d.email, 254) ?? '').toLowerCase();
  const firstName = text(d.firstName, 80);
  const lastName = text(d.lastName, 80);
  const country = text(d.country, 80);
  const customerType = oneOf(d.customerType, ['individual', 'workshop'] as const);
  const companyName = optionalText(d.companyName, 120);
  const phone = optionalText(d.phone, 30);
  const fileType = oneOf(d.fileType, ['ECU', 'TCU'] as const);
  const service = oneOf(d.requestedService, SERVICES);
  const make = text(d.make, 60);
  const model = text(d.model, 60);
  const year = Number(d.year);
  const engine = text(d.engine, 80);
  const fuel = oneOf(d.fuelType, FUEL_TYPES);
  const vin = typeof d.vin === 'string' ? d.vin.trim().toUpperCase() : '';
  const manufacturer = optionalText(d.manufacturer, 80);
  const hardware = optionalText(d.hardwareNumber, 80);
  const software = optionalText(d.softwareNumber, 80);
  const createAccount = body.createAccount === true;

  if (
    !jobId || !EMAIL.test(email) || !firstName || !lastName || !country || !customerType || !fileType || !service ||
    !make || !model || !engine || !fuel || !VIN.test(vin) || !Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1 ||
    companyName === undefined || phone === undefined || manufacturer === undefined || hardware === undefined || software === undefined ||
    (customerType === 'workshop' && !companyName)
  ) {
    throw new Error('Some details are missing or invalid.');
  }

  const { data: job } = await admin.from('jobs').select('id, reference, job_type').eq('id', jobId).maybeSingle();
  if (!job) throw new Error('Job not found.');
  if (job.job_type !== 'guest') throw new Error('This job is not a guest request.');

  const { error: updateError } = await admin
    .from('jobs')
    .update({
      job_type: 'customer',
      customer_type: customerType,
      customer_first_name: firstName,
      customer_last_name: lastName,
      customer_email: email,
      customer_phone: phone,
      customer_country: country,
      company_name: customerType === 'workshop' ? companyName : null,
      file_type: fileType,
      requested_service: service,
      vehicle_make: make,
      vehicle_model: model,
      vehicle_year: year,
      vehicle_engine: engine,
      vehicle_fuel_type: fuel,
      vehicle_vin: vin,
      ecu_manufacturer: manufacturer,
      ecu_hardware_number: hardware,
      ecu_software_number: software,
    })
    .eq('id', jobId);
  if (updateError) throw updateError;

  let account: 'none' | 'linked' | 'invited' = 'none';
  if (createAccount) {
    const details = { full_name: `${firstName} ${lastName}`, company_name: customerType === 'workshop' ? companyName : null, customer_type: customerType, country, phone };
    const { data: existing } = await admin.from('profiles').select('id').eq('email', email).maybeSingle();
    let userId = existing?.id as string | undefined;
    if (userId) {
      account = 'linked';
    } else {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${siteUrl()}/dashboard/jobs/${job.reference}`,
        data: { full_name: details.full_name },
      });
      if (error || !data.user) throw new Error(error?.message ?? 'The account invitation could not be sent.');
      userId = data.user.id;
      account = 'invited';
      await admin.from('profiles').upsert({ id: userId, email, ...details });
    }
    await admin.from('jobs').update({ user_id: userId }).eq('id', jobId);
  }

  await admin.from('job_events').insert({ job_id: jobId, actor_id: callerId, action: 'converted_from_guest', details: { account } });
  return { ok: true, account };
}
