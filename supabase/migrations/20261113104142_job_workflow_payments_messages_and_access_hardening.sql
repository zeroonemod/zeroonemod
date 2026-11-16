/*
# Job workflow, payments, messages and access hardening

Plain-English summary
This migration adds the admin and customer workflow for jobs: quotations, payment links,
manual payment recording, completed-file delivery, conversation threads, internal notes,
an activity log and GDPR deletion requests. It also closes a privilege gap so customers can
no longer change their own role.

1. New columns on jobs
- quote_amount, quote_currency (default EUR), quote_notes, quoted_at: the quotation sent by admin.
- payment_link: external payment link (any provider) shown as PAY NOW when status is Awaiting Payment.
- payment_status: not_paid or paid. paid_at: when the job was marked as paid.

2. New tables
- payments: one row per recorded payment (amount, currency, method, status, reference, created_by).
  provider and provider_reference are reserved for a future automatic payment webhook.
- job_messages: conversation between the customer and ZEROONEMOD inside a job, with read markers.
- job_notes: internal admin-only notes. Never visible to customers.
- job_events: activity log of every admin action with timestamp and actor.
- data_deletion_requests: GDPR erasure requests created by customers and reviewed by admin.

3. New or changed file kinds
- job_files.kind now also accepts additional (files uploaded by the customer while the job is
  Awaiting Information).

4. Security changes
- Helper function is_admin() reports whether the signed-in user has the admin role.
- profiles: customers can insert and update only full_name, company_name, country and phone.
  The role column is no longer writable from the browser (closes self-promotion to admin).
- jobs, job_files, contact_messages, partner_requests: browser roles lose write grants. Jobs
  change only through the admin functions below, which check the caller is an admin.
- anon loses all access except reading the public FAQ.
- Admin read access to all jobs, files, profiles, messages, notes, events and payments.
- Storage: customers may read only their own job folders; completed files are readable by the
  customer only once the job is paid. Admin uploads completed files. Customers upload additional
  files only while the job is Awaiting Information.
- Admin workflow functions (set status, send quotation, set payment link, mark as paid) are
  callable by signed-in users only, and reject non-admins.

5. Important notes
- Status values are unchanged: Submitted, Under Review, Awaiting Information, Quotation Sent,
  Awaiting Payment, In Progress, Completed, Delivered.
- Delivery requires the job to be marked as paid and at least one completed file. Marking as
  paid with the method Partner arrangement counts as paid.
- No existing rows are altered or removed.
*/

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin');
$$;

REVOKE EXECUTE ON FUNCTION public.is_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quote_amount numeric(10,2);
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quote_currency text NOT NULL DEFAULT 'EUR';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quote_notes text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS quoted_at timestamptz;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS payment_link text;
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS payment_status text NOT NULL DEFAULT 'not_paid';
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS paid_at timestamptz;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_payment_status_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_payment_status_check CHECK (payment_status IN ('not_paid', 'paid'));
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_quote_currency_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_quote_currency_check CHECK (quote_currency ~ '^[A-Z]{3}$');
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_quote_amount_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_quote_amount_check CHECK (quote_amount IS NULL OR quote_amount > 0);
  END IF;
END $$;

ALTER TABLE public.job_files DROP CONSTRAINT IF EXISTS job_files_kind_check;
ALTER TABLE public.job_files ADD CONSTRAINT job_files_kind_check CHECK (kind IN ('original', 'additional', 'completed'));

CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON public.jobs (user_id);
CREATE INDEX IF NOT EXISTS job_files_job_id_idx ON public.job_files (job_id);

CREATE TABLE IF NOT EXISTS public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  method text NOT NULL CHECK (method IN ('card_link', 'bank_transfer', 'partner_arrangement', 'other')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed')),
  reference_note text,
  provider text,
  provider_reference text,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS payments_job_id_idx ON public.payments (job_id);

CREATE TABLE IF NOT EXISTS public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  customer_read_at timestamptz,
  admin_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_messages_job_id_idx ON public.job_messages (job_id, created_at);

CREATE TABLE IF NOT EXISTS public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_notes_job_id_idx ON public.job_notes (job_id, created_at);

CREATE TABLE IF NOT EXISTS public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS job_events_job_id_idx ON public.job_events (job_id, created_at);

CREATE TABLE IF NOT EXISTS public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  email text NOT NULL DEFAULT (auth.jwt() ->> 'email'),
  details text CHECK (details IS NULL OR char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.profiles, public.jobs, public.job_files, public.contact_messages,
  public.partner_requests, public.faq_items FROM anon, authenticated;

GRANT SELECT ON public.faq_items TO anon, authenticated;
GRANT SELECT ON public.jobs, public.job_files TO authenticated;
GRANT INSERT ON public.job_files TO authenticated;
GRANT SELECT ON public.profiles TO authenticated;
GRANT INSERT (id, full_name, company_name, country, phone) ON public.profiles TO authenticated;
GRANT UPDATE (full_name, company_name, country, phone) ON public.profiles TO authenticated;
GRANT SELECT, INSERT ON public.payments, public.job_notes, public.job_events, public.job_messages TO authenticated;
GRANT UPDATE (customer_read_at, admin_read_at) ON public.job_messages TO authenticated;
GRANT SELECT, INSERT ON public.data_deletion_requests TO authenticated;
GRANT UPDATE (status) ON public.data_deletion_requests TO authenticated;
GRANT SELECT ON public.payments, public.job_events TO authenticated;

DROP POLICY IF EXISTS "select_own_profile" ON public.profiles;
CREATE POLICY "select_own_profile" ON public.profiles FOR SELECT TO authenticated
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "insert_own_profile" ON public.profiles;
CREATE POLICY "insert_own_profile" ON public.profiles FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON public.profiles;
CREATE POLICY "update_own_profile" ON public.profiles FOR UPDATE TO authenticated
  USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "admin_select_profiles" ON public.profiles;
CREATE POLICY "admin_select_profiles" ON public.profiles FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "admin_select_jobs" ON public.jobs;
CREATE POLICY "admin_select_jobs" ON public.jobs FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "select_own_job_files" ON public.job_files;
CREATE POLICY "select_own_job_files" ON public.job_files FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_files.job_id AND j.user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "customer_insert_additional_job_files" ON public.job_files;
CREATE POLICY "customer_insert_additional_job_files" ON public.job_files FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'additional'
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.id = job_files.job_id AND j.user_id = auth.uid() AND j.status = 'Awaiting Information'
    )
  );

DROP POLICY IF EXISTS "admin_insert_completed_job_files" ON public.job_files;
CREATE POLICY "admin_insert_completed_job_files" ON public.job_files FOR INSERT TO authenticated
  WITH CHECK (kind = 'completed' AND public.is_admin());

DROP POLICY IF EXISTS "select_job_payments" ON public.payments;
CREATE POLICY "select_job_payments" ON public.payments FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = payments.job_id AND j.user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "admin_insert_payments" ON public.payments;
CREATE POLICY "admin_insert_payments" ON public.payments FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND created_by = auth.uid());

DROP POLICY IF EXISTS "select_job_messages" ON public.job_messages;
CREATE POLICY "select_job_messages" ON public.job_messages FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_messages.job_id AND j.user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "customer_insert_job_messages" ON public.job_messages;
CREATE POLICY "customer_insert_job_messages" ON public.job_messages FOR INSERT TO authenticated
  WITH CHECK (
    sender_role = 'customer'
    AND sender_id = auth.uid()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_messages.job_id AND j.user_id = auth.uid())
  );

DROP POLICY IF EXISTS "admin_insert_job_messages" ON public.job_messages;
CREATE POLICY "admin_insert_job_messages" ON public.job_messages FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'admin' AND sender_id = auth.uid() AND public.is_admin());

DROP POLICY IF EXISTS "update_job_message_read_markers" ON public.job_messages;
CREATE POLICY "update_job_message_read_markers" ON public.job_messages FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_messages.job_id AND j.user_id = auth.uid()) OR public.is_admin())
  WITH CHECK (EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_messages.job_id AND j.user_id = auth.uid()) OR public.is_admin());

DROP POLICY IF EXISTS "admin_all_job_notes" ON public.job_notes;
CREATE POLICY "admin_select_job_notes" ON public.job_notes FOR SELECT TO authenticated
  USING (public.is_admin());
CREATE POLICY "admin_insert_job_notes" ON public.job_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND author_id = auth.uid());

DROP POLICY IF EXISTS "admin_select_job_events" ON public.job_events;
CREATE POLICY "admin_select_job_events" ON public.job_events FOR SELECT TO authenticated
  USING (public.is_admin());

DROP POLICY IF EXISTS "select_own_deletion_requests" ON public.data_deletion_requests;
CREATE POLICY "select_own_deletion_requests" ON public.data_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

DROP POLICY IF EXISTS "insert_own_deletion_requests" ON public.data_deletion_requests;
CREATE POLICY "insert_own_deletion_requests" ON public.data_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS "admin_update_deletion_requests" ON public.data_deletion_requests;
CREATE POLICY "admin_update_deletion_requests" ON public.data_deletion_requests FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "customer_upload_additional_files" ON storage.objects;
CREATE POLICY "customer_upload_additional_files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-files'
    AND (storage.foldername(name))[2] = 'additional'
    AND EXISTS (
      SELECT 1 FROM public.jobs j
      WHERE j.reference = (storage.foldername(name))[1]
        AND j.user_id = auth.uid()
        AND j.status = 'Awaiting Information'
    )
  );

DROP POLICY IF EXISTS "admin_upload_completed_files" ON storage.objects;
CREATE POLICY "admin_upload_completed_files" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-files'
    AND (storage.foldername(name))[2] = 'completed'
    AND public.is_admin()
  );

DROP POLICY IF EXISTS "read_job_files" ON storage.objects;
CREATE POLICY "read_job_files" ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-files'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.jobs j
        WHERE j.reference = (storage.foldername(name))[1]
          AND j.user_id = auth.uid()
          AND (
            (storage.foldername(name))[2] IN ('original', 'additional')
            OR ((storage.foldername(name))[2] = 'completed' AND j.payment_status = 'paid')
          )
      )
    )
  );

CREATE OR REPLACE FUNCTION public.log_job_event(p_job uuid, p_action text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  INSERT INTO public.job_events (job_id, actor_id, action, details)
  VALUES (p_job, auth.uid(), p_action, p_details);
$$;
REVOKE EXECUTE ON FUNCTION public.log_job_event(uuid, text, jsonb) FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.admin_set_job_status(p_job uuid, p_status text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('Submitted', 'Under Review', 'Awaiting Information', 'Quotation Sent',
                      'Awaiting Payment', 'In Progress', 'Completed', 'Delivered') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;

  SELECT * INTO v_job FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  IF p_status = 'Awaiting Payment' AND v_job.payment_link IS NULL THEN
    RAISE EXCEPTION 'Add a payment link before setting Awaiting Payment' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'Delivered' THEN
    IF v_job.payment_status <> 'paid' THEN
      RAISE EXCEPTION 'Mark the job as paid before delivery' USING ERRCODE = '22023';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM public.job_files WHERE job_id = p_job AND kind = 'completed') THEN
      RAISE EXCEPTION 'Upload a completed file before delivery' USING ERRCODE = '22023';
    END IF;
  END IF;

  UPDATE public.jobs SET status = p_status, updated_at = now() WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'status_changed', jsonb_build_object('from', v_job.status, 'to', p_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_send_quotation(p_job uuid, p_amount numeric, p_currency text, p_notes text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Enter a valid price' USING ERRCODE = '22023';
  END IF;
  IF p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid currency' USING ERRCODE = '22023';
  END IF;
  IF NOT EXISTS (SELECT 1 FROM public.jobs WHERE id = p_job) THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.jobs
  SET quote_amount = p_amount,
      quote_currency = p_currency,
      quote_notes = NULLIF(trim(coalesce(p_notes, '')), ''),
      quoted_at = now(),
      status = 'Quotation Sent',
      updated_at = now()
  WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'quotation_sent', jsonb_build_object('amount', p_amount, 'currency', p_currency));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_payment_link(p_job uuid, p_link text)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_link text := NULLIF(trim(coalesce(p_link, '')), '');
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF v_link IS NOT NULL AND (v_link !~* '^https://' OR char_length(v_link) > 2048) THEN
    RAISE EXCEPTION 'Payment link must start with https://' USING ERRCODE = '22023';
  END IF;

  UPDATE public.jobs SET payment_link = v_link, updated_at = now() WHERE id = p_job;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  PERFORM public.log_job_event(p_job, 'payment_link_updated', jsonb_build_object('set', v_link IS NOT NULL));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_paid(
  p_job uuid,
  p_amount numeric,
  p_currency text,
  p_method text,
  p_reference text
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.payment_status = 'paid' THEN
    RAISE EXCEPTION 'This job is already marked as paid' USING ERRCODE = '22023';
  END IF;
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Enter a valid amount' USING ERRCODE = '22023';
  END IF;
  IF p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid currency' USING ERRCODE = '22023';
  END IF;
  IF p_method NOT IN ('card_link', 'bank_transfer', 'partner_arrangement', 'other') THEN
    RAISE EXCEPTION 'Invalid payment method' USING ERRCODE = '22023';
  END IF;

  INSERT INTO public.payments (job_id, amount, currency, method, status, reference_note, paid_at, created_by)
  VALUES (p_job, p_amount, p_currency, p_method, 'paid', NULLIF(trim(coalesce(p_reference, '')), ''), now(), auth.uid());

  UPDATE public.jobs SET payment_status = 'paid', paid_at = now(), updated_at = now() WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'marked_paid', jsonb_build_object('amount', p_amount, 'currency', p_currency, 'method', p_method));
END;
$$;

REVOKE EXECUTE ON FUNCTION public.admin_set_job_status(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_send_quotation(uuid, numeric, text, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_set_payment_link(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.admin_mark_paid(uuid, numeric, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_job_status(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_send_quotation(uuid, numeric, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_set_payment_link(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_mark_paid(uuid, numeric, text, text, text) TO authenticated;
