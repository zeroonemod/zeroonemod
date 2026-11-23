/*
# Two-step verification (2FA) and the admin / info / billing email addresses

Plain-English summary
1. Two-step verification
   - Customers, partners and the admin can switch on two-step verification (an authenticator app).
   - Once it is on, a login with only the password is not enough: the database refuses their jobs,
     files, messages and payments (and for the admin, all admin access) until the 6-digit code has
     been entered. People without two-step verification are not affected.
2. Email addresses in Settings
   - notification_email: where website notifications go (new jobs, guest requests, messages,
     partner requests). Default admin@zeroonemod.com.
   - support_email: the public contact address; receives the contact form and customer replies.
     Default info@zeroonemod.com.
   - billing_email: sender and reply address for quotations, payment links and download links.
     Default billing@zeroonemod.com.

Safe to run on the live database.
*/

-- ---------------------------------------------------------------------------
-- 1. Two-step verification
-- ---------------------------------------------------------------------------

-- True when the signed-in user has passed two-step verification in this session,
-- or has not switched it on. Reads auth.mfa_factors, so it runs as the owner.
CREATE OR REPLACE FUNCTION public.mfa_ok()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, auth AS $$
  SELECT coalesce(auth.jwt() ->> 'aal', 'aal1') = 'aal2'
      OR NOT EXISTS (SELECT 1 FROM auth.mfa_factors f WHERE f.user_id = auth.uid() AND f.status = 'verified');
$$;
REVOKE EXECUTE ON FUNCTION public.mfa_ok() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.mfa_ok() TO authenticated, service_role;

-- The admin must also have passed two-step verification when it is switched on.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active)
     AND public.mfa_ok();
$$;

-- Restrictive policies are combined with AND on top of the existing ones.
DROP POLICY IF EXISTS mfa_required_jobs ON public.jobs;
CREATE POLICY mfa_required_jobs ON public.jobs AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
DROP POLICY IF EXISTS mfa_required_job_files ON public.job_files;
CREATE POLICY mfa_required_job_files ON public.job_files AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
DROP POLICY IF EXISTS mfa_required_job_messages ON public.job_messages;
CREATE POLICY mfa_required_job_messages ON public.job_messages AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
DROP POLICY IF EXISTS mfa_required_payments ON public.payments;
CREATE POLICY mfa_required_payments ON public.payments AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());
DROP POLICY IF EXISTS mfa_required_deletion_requests ON public.data_deletion_requests;
CREATE POLICY mfa_required_deletion_requests ON public.data_deletion_requests AS RESTRICTIVE FOR ALL TO authenticated
  USING (public.mfa_ok()) WITH CHECK (public.mfa_ok());

-- Job files in storage too. Uploads for a new submission (pending/) stay open.
DROP POLICY IF EXISTS mfa_required_job_storage ON storage.objects;
CREATE POLICY mfa_required_job_storage ON storage.objects AS RESTRICTIVE FOR ALL TO authenticated
  USING (bucket_id <> 'job-files' OR (storage.foldername(name))[1] = 'pending' OR public.mfa_ok())
  WITH CHECK (bucket_id <> 'job-files' OR (storage.foldername(name))[1] = 'pending' OR public.mfa_ok());

-- ---------------------------------------------------------------------------
-- 2. Email addresses
-- ---------------------------------------------------------------------------

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS support_email text NOT NULL DEFAULT 'info@zeroonemod.com';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS billing_email text NOT NULL DEFAULT 'billing@zeroonemod.com';
ALTER TABLE public.admin_settings ALTER COLUMN notification_email SET DEFAULT 'admin@zeroonemod.com';

-- Notifications move from info@ to admin@ unless the admin already chose another address.
UPDATE public.admin_settings SET notification_email = 'admin@zeroonemod.com' WHERE notification_email = 'info@zeroonemod.com';

GRANT UPDATE (support_email, billing_email) ON public.admin_settings TO authenticated;
