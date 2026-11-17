/*
# ZEROONEMOD database schema (complete, for a fresh Supabase project)

Run this single file once on a new project (SQL editor or `supabase db push`).
It creates everything the website needs: tables, the job reference sequence,
row level security policies, the private storage bucket and its policies,
helper and admin functions, and triggers.

Plain-English summary
- Customer, partner and admin accounts (profiles), created automatically for every new login.
- Jobs with references ZOM-000001, ZOM-000002, ... and the eight agreed statuses.
- Guest requests (job_type 'guest'): files plus an email and/or phone, no account, same numbering.
  The admin can convert one into a normal customer job later.
- Files, payments, messages, internal notes, activity log, GDPR deletion requests.
- Contact messages and partner access requests from the public forms.
- FAQ entries and admin settings (notification email, file retention, reply templates).
- Rate limiting used by the server functions.

Security model
- Row level security on every table. Customers and partners see only their own jobs, files,
  payments and messages. The admin sees everything.
- The browser roles get only the table rights the policies use; everything else is denied.
- Every admin action that changes a job runs through a SECURITY DEFINER function that checks
  the caller is an admin and writes to the activity log.
- New jobs, contact messages and partner requests are written only by the server functions
  (service role), never directly from the browser.
*/

-- ---------------------------------------------------------------------------
-- 1. Tables
-- ---------------------------------------------------------------------------

CREATE SEQUENCE IF NOT EXISTS public.job_reference_seq START WITH 1;

CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email text,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'partner', 'admin')),
  full_name text CHECK (full_name IS NULL OR char_length(full_name) <= 160),
  company_name text CHECK (company_name IS NULL OR char_length(company_name) <= 120),
  customer_type text CHECK (customer_type IN ('individual', 'workshop')),
  country text CHECK (country IS NULL OR char_length(country) <= 80),
  phone text CHECK (phone IS NULL OR char_length(phone) <= 30),
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX profiles_role_idx ON public.profiles (role);
CREATE INDEX profiles_email_idx ON public.profiles (lower(email));

-- Admin-only notes about a partner (agreed pricing). Kept apart from profiles so partners cannot read them.
CREATE TABLE public.partner_notes (
  profile_id uuid PRIMARY KEY REFERENCES public.profiles(id) ON DELETE CASCADE,
  pricing_notes text CHECK (pricing_notes IS NULL OR char_length(pricing_notes) <= 5000),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT 'ZOM-' || lpad(nextval('public.job_reference_seq')::text, 6, '0'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  job_type text NOT NULL DEFAULT 'customer' CHECK (job_type IN ('customer', 'guest')),
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN (
    'Submitted', 'Under Review', 'Awaiting Information', 'Quotation Sent',
    'Awaiting Payment', 'In Progress', 'Completed', 'Delivered'
  )),
  file_type text CHECK (file_type IN ('ECU', 'TCU')),
  requested_service text CHECK (requested_service IN (
    'stage1_calibration', 'original_restoration', 'decoding', 'other_modification', 'not_sure'
  )),
  service_comments text,
  customer_type text CHECK (customer_type IN ('individual', 'workshop')),
  customer_first_name text,
  customer_last_name text,
  customer_email text,
  customer_country text,
  customer_phone text,
  company_name text,
  vehicle_make text,
  vehicle_model text,
  vehicle_year integer,
  vehicle_engine text,
  vehicle_fuel_type text,
  vehicle_vin text,
  ecu_manufacturer text,
  ecu_hardware_number text,
  ecu_software_number text,
  ecu_identification_numbers text,
  privacy_consent_at timestamptz NOT NULL,
  privacy_policy_version text NOT NULL DEFAULT 'v1',
  quote_amount numeric(10,2) CHECK (quote_amount IS NULL OR quote_amount > 0),
  quote_currency text NOT NULL DEFAULT 'EUR' CHECK (quote_currency ~ '^[A-Z]{3}$'),
  quote_notes text,
  quoted_at timestamptz,
  payment_link text,
  payment_status text NOT NULL DEFAULT 'not_paid' CHECK (payment_status IN ('not_paid', 'paid')),
  payment_method text CHECK (payment_method IN ('card_link', 'bank_transfer', 'partner_arrangement', 'other')),
  paid_at timestamptz,
  delivered_at timestamptz,
  files_deleted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  -- A customer job always has the full customer, vehicle and service details.
  CONSTRAINT jobs_customer_details_check CHECK (
    job_type = 'guest' OR (
      file_type IS NOT NULL AND requested_service IS NOT NULL AND customer_type IS NOT NULL
      AND customer_first_name IS NOT NULL AND customer_last_name IS NOT NULL AND customer_email IS NOT NULL
      AND customer_country IS NOT NULL AND vehicle_make IS NOT NULL AND vehicle_model IS NOT NULL
      AND vehicle_year IS NOT NULL AND vehicle_engine IS NOT NULL AND vehicle_fuel_type IS NOT NULL
      AND vehicle_vin IS NOT NULL
    )
  ),
  -- A guest request needs at least an email or a phone number.
  CONSTRAINT jobs_guest_contact_check CHECK (job_type <> 'guest' OR customer_email IS NOT NULL OR customer_phone IS NOT NULL)
);
CREATE INDEX jobs_user_id_idx ON public.jobs (user_id);
CREATE INDEX jobs_job_type_idx ON public.jobs (job_type);
CREATE INDEX jobs_customer_email_idx ON public.jobs (lower(customer_email));
CREATE INDEX jobs_created_at_idx ON public.jobs (created_at DESC);
CREATE INDEX jobs_status_idx ON public.jobs (status);

CREATE TABLE public.job_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('original', 'additional', 'completed')),
  file_name text NOT NULL CHECK (char_length(file_name) BETWEEN 1 AND 200),
  storage_path text NOT NULL UNIQUE,
  size_bytes bigint NOT NULL DEFAULT 0 CHECK (size_bytes >= 0),
  mime_type text,
  uploaded_by uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_files_job_id_idx ON public.job_files (job_id);

CREATE TABLE public.payments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  amount numeric(10,2) NOT NULL CHECK (amount > 0),
  currency text NOT NULL DEFAULT 'EUR' CHECK (currency ~ '^[A-Z]{3}$'),
  method text NOT NULL CHECK (method IN ('card_link', 'bank_transfer', 'partner_arrangement', 'other')),
  status text NOT NULL DEFAULT 'paid' CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  reference_note text,
  provider text,              -- reserved for an automatic provider (stripe, redsys)
  provider_reference text UNIQUE,
  paid_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX payments_job_id_idx ON public.payments (job_id);

CREATE TABLE public.job_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  sender_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  sender_role text NOT NULL CHECK (sender_role IN ('customer', 'admin')),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  customer_read_at timestamptz,
  admin_read_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_messages_job_id_idx ON public.job_messages (job_id, created_at);
CREATE INDEX job_messages_unread_admin_idx ON public.job_messages (job_id) WHERE sender_role = 'customer' AND admin_read_at IS NULL;

CREATE TABLE public.job_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  author_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  body text NOT NULL CHECK (char_length(body) BETWEEN 1 AND 5000),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_notes_job_id_idx ON public.job_notes (job_id, created_at);

CREATE TABLE public.job_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES public.jobs(id) ON DELETE CASCADE,
  actor_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  action text NOT NULL,
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX job_events_job_id_idx ON public.job_events (job_id, created_at);

CREATE TABLE public.data_deletion_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  email text NOT NULL DEFAULT (auth.jwt() ->> 'email'),
  details text CHECK (details IS NULL OR char_length(details) <= 2000),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'rejected')),
  processed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.contact_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  consent_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'replied', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX contact_messages_email_created_idx ON public.contact_messages (lower(email), created_at DESC);

CREATE TABLE public.partner_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_name text NOT NULL,
  contact_name text NOT NULL,
  email text NOT NULL,
  phone text,
  country text NOT NULL,
  message text,
  consent_at timestamptz NOT NULL,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at timestamptz,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX partner_requests_email_created_idx ON public.partner_requests (lower(email), created_at DESC);

CREATE TABLE public.faq_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  question text NOT NULL CHECK (char_length(question) BETWEEN 1 AND 300),
  answer text NOT NULL CHECK (char_length(answer) BETWEEN 1 AND 3000),
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX faq_items_sort_order_idx ON public.faq_items (sort_order);

CREATE TABLE public.admin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  notification_email text NOT NULL DEFAULT 'info@zeroonemod.com',
  retention_days integer NOT NULL DEFAULT 730 CHECK (retention_days BETWEEN 30 AND 3650),
  auto_delete_enabled boolean NOT NULL DEFAULT false,
  templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.rate_limit_hits (
  id bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  key text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX rate_limit_hits_key_idx ON public.rate_limit_hits (key, created_at DESC);

-- ---------------------------------------------------------------------------
-- 2. Seed data
-- ---------------------------------------------------------------------------

INSERT INTO public.admin_settings (id, templates) VALUES (true, '[
  {"id": "need-info", "title": "Need more information", "body": "Thank you for your submission. To review your file we need a little more information. Could you please send us the following:\n\n"},
  {"id": "quotation-ready", "title": "Quotation ready", "body": "Your quotation is ready in your account. Once payment is complete we will start working on your file."},
  {"id": "file-ready", "title": "File ready", "body": "Your modified file has been completed and is now available for download in your account."},
  {"id": "not-supported", "title": "Not supported", "body": "Thank you for your submission. After reviewing your file, we are unable to offer the requested service for this control unit. No payment is due."}
]'::jsonb);

INSERT INTO public.faq_items (question, answer, sort_order) VALUES
  ('How do I submit a file and how do I receive it?',
   'Upload your original file and complete the short submission form. After a technical review, we send you a quotation and payment instructions. Once payment is confirmed, the completed file is released to you through a secure, time-limited download link.', 1),
  ('How and when do I pay?',
   'Payment is made through a secure payment link that we send to you after reviewing your file. We do not release the completed file until payment has been received.', 2),
  ('Will my file work on my ECU or TCU?',
   'Compatibility depends on the ECU or TCU, the vehicle and the original file. Every submission is reviewed individually before any work starts, and we will tell you if a requested service is not available for your file.', 3),
  ('How long does it take?',
   'Turnaround depends on the service, the complexity of the file and the current workload. You receive the expected timing with your quotation.', 4),
  ('Who can see my files?',
   'Your files are stored in a private, access-controlled location. They are never published on public pages or shared folders, and download links expire after a short time. Files are kept only as long as needed and are deleted according to our retention policy.', 5);

-- ---------------------------------------------------------------------------
-- 3. Helper functions and triggers
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin' AND is_active);
$$;

CREATE OR REPLACE FUNCTION public.owns_job(p_job uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.jobs WHERE id = p_job AND user_id = auth.uid());
$$;

CREATE OR REPLACE FUNCTION public.touch_updated_at()
RETURNS trigger LANGUAGE plpgsql SET search_path = public AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_touch BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER jobs_touch BEFORE UPDATE ON public.jobs FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER faq_touch BEFORE UPDATE ON public.faq_items FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER settings_touch BEFORE UPDATE ON public.admin_settings FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();
CREATE TRIGGER partner_notes_touch BEFORE UPDATE ON public.partner_notes FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- Every new auth user gets a profile. The role comes only from app_metadata, which only the server can set.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, email, role, full_name)
  VALUES (
    NEW.id,
    lower(NEW.email),
    CASE WHEN NEW.raw_app_meta_data ->> 'role' = 'partner' THEN 'partner' ELSE 'customer' END,
    NULLIF(trim(coalesce(NEW.raw_user_meta_data ->> 'full_name', '')), '')
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

CREATE OR REPLACE FUNCTION public.handle_user_email_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.profiles SET email = lower(NEW.email) WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_email_changed AFTER UPDATE OF email ON auth.users
  FOR EACH ROW WHEN (OLD.email IS DISTINCT FROM NEW.email) EXECUTE FUNCTION public.handle_user_email_change();

CREATE OR REPLACE FUNCTION public.log_job_event(p_job uuid, p_action text, p_details jsonb DEFAULT '{}'::jsonb)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  INSERT INTO public.job_events (job_id, actor_id, action, details) VALUES (p_job, auth.uid(), p_action, p_details);
$$;

-- Log every file added to a job.
CREATE OR REPLACE FUNCTION public.log_job_file()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.log_job_event(NEW.job_id, 'file_uploaded', jsonb_build_object('kind', NEW.kind, 'file', NEW.file_name));
  RETURN NEW;
END;
$$;
CREATE TRIGGER job_files_log AFTER INSERT ON public.job_files FOR EACH ROW EXECUTE FUNCTION public.log_job_file();

-- Returns true when the key is over its limit. Records the hit either way. Server functions only.
CREATE OR REPLACE FUNCTION public.hit_rate_limit(p_key text, p_max integer, p_window_seconds integer)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  DELETE FROM public.rate_limit_hits WHERE created_at < now() - interval '2 days';
  SELECT count(*) INTO v_count FROM public.rate_limit_hits
   WHERE key = p_key AND created_at > now() - make_interval(secs => p_window_seconds);
  INSERT INTO public.rate_limit_hits (key) VALUES (p_key);
  RETURN v_count >= p_max;
END;
$$;

-- ---------------------------------------------------------------------------
-- 4. Admin workflow functions
-- ---------------------------------------------------------------------------

CREATE OR REPLACE FUNCTION public.require_admin()
RETURNS void LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_job_status(p_job uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
BEGIN
  PERFORM public.require_admin();
  IF p_status NOT IN ('Submitted', 'Under Review', 'Awaiting Information', 'Quotation Sent',
                      'Awaiting Payment', 'In Progress', 'Completed', 'Delivered') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.status = p_status THEN
    RETURN;
  END IF;
  IF p_status = 'Awaiting Payment' AND v_job.payment_link IS NULL AND v_job.payment_status <> 'paid' THEN
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

  UPDATE public.jobs
     SET status = p_status,
         delivered_at = CASE WHEN p_status = 'Delivered' THEN now() ELSE delivered_at END
   WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'status_changed', jsonb_build_object('from', v_job.status, 'to', p_status));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_send_quotation(p_job uuid, p_amount numeric, p_currency text, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
BEGIN
  PERFORM public.require_admin();
  IF p_amount IS NULL OR p_amount <= 0 OR p_amount > 100000 THEN
    RAISE EXCEPTION 'Enter a valid price' USING ERRCODE = '22023';
  END IF;
  IF p_currency !~ '^[A-Z]{3}$' THEN
    RAISE EXCEPTION 'Invalid currency' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;
  IF v_job.payment_status = 'paid' THEN
    RAISE EXCEPTION 'This job is already paid' USING ERRCODE = '22023';
  END IF;

  UPDATE public.jobs
     SET quote_amount = round(p_amount, 2),
         quote_currency = p_currency,
         quote_notes = NULLIF(trim(coalesce(p_notes, '')), ''),
         quoted_at = now(),
         status = CASE WHEN payment_link IS NOT NULL THEN 'Awaiting Payment' ELSE 'Quotation Sent' END
   WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'quotation_sent', jsonb_build_object('amount', round(p_amount, 2), 'currency', p_currency));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_payment_link(p_job uuid, p_link text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_link text := NULLIF(trim(coalesce(p_link, '')), '');
  v_job public.jobs%ROWTYPE;
BEGIN
  PERFORM public.require_admin();
  IF v_link IS NOT NULL AND (v_link !~* '^https://[^\s]+$' OR char_length(v_link) > 2048) THEN
    RAISE EXCEPTION 'The payment link must start with https://' USING ERRCODE = '22023';
  END IF;
  SELECT * INTO v_job FROM public.jobs WHERE id = p_job FOR UPDATE;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Job not found' USING ERRCODE = 'P0002';
  END IF;

  UPDATE public.jobs
     SET payment_link = v_link,
         status = CASE WHEN v_link IS NOT NULL AND status = 'Quotation Sent' AND payment_status = 'not_paid' THEN 'Awaiting Payment' ELSE status END
   WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'payment_link_updated', jsonb_build_object('set', v_link IS NOT NULL));
  IF v_link IS NOT NULL AND v_job.status = 'Quotation Sent' AND v_job.payment_status = 'not_paid' THEN
    PERFORM public.log_job_event(p_job, 'status_changed', jsonb_build_object('from', v_job.status, 'to', 'Awaiting Payment'));
  END IF;
END;
$$;

-- Shared by the admin "Mark as paid" button and a future payment provider webhook.
CREATE OR REPLACE FUNCTION public.apply_payment(
  p_job uuid, p_amount numeric, p_currency text, p_method text, p_reference text,
  p_paid_at timestamptz, p_provider text, p_provider_reference text, p_actor uuid
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
  v_new_status text;
BEGIN
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

  INSERT INTO public.payments (job_id, amount, currency, method, status, reference_note, provider, provider_reference, paid_at, created_by)
  VALUES (p_job, round(p_amount, 2), p_currency, p_method, 'paid', NULLIF(trim(coalesce(p_reference, '')), ''),
          p_provider, p_provider_reference, coalesce(p_paid_at, now()), p_actor);

  v_new_status := CASE WHEN v_job.status IN ('Submitted', 'Under Review', 'Quotation Sent', 'Awaiting Payment') THEN 'In Progress' ELSE v_job.status END;

  UPDATE public.jobs
     SET payment_status = 'paid', payment_method = p_method, paid_at = coalesce(p_paid_at, now()), status = v_new_status
   WHERE id = p_job;

  INSERT INTO public.job_events (job_id, actor_id, action, details)
  VALUES (p_job, p_actor, 'marked_paid', jsonb_build_object('amount', round(p_amount, 2), 'currency', p_currency, 'method', p_method, 'provider', p_provider));
  IF v_new_status <> v_job.status THEN
    INSERT INTO public.job_events (job_id, actor_id, action, details)
    VALUES (p_job, p_actor, 'status_changed', jsonb_build_object('from', v_job.status, 'to', v_new_status));
  END IF;
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_mark_paid(
  p_job uuid, p_amount numeric, p_currency text, p_method text, p_reference text, p_paid_at timestamptz DEFAULT NULL
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  PERFORM public.apply_payment(p_job, p_amount, p_currency, p_method, p_reference, p_paid_at, NULL, NULL, auth.uid());
END;
$$;

-- Called after the admin removed a job's files from storage. Removes the file records and logs it.
CREATE OR REPLACE FUNCTION public.admin_mark_files_deleted(p_job uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.require_admin();
  DELETE FROM public.job_files WHERE job_id = p_job;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  UPDATE public.jobs SET files_deleted_at = now() WHERE id = p_job;
  PERFORM public.log_job_event(p_job, 'files_deleted', jsonb_build_object('count', v_count));
END;
$$;

CREATE OR REPLACE FUNCTION public.admin_set_partner_notes(p_profile uuid, p_notes text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  PERFORM public.require_admin();
  INSERT INTO public.partner_notes (profile_id, pricing_notes)
  VALUES (p_profile, NULLIF(trim(coalesce(p_notes, '')), ''))
  ON CONFLICT (profile_id) DO UPDATE SET pricing_notes = EXCLUDED.pricing_notes;
END;
$$;

-- Lists upload leftovers from submissions that were never completed. Server functions only.
CREATE OR REPLACE FUNCTION public.stale_pending_objects(p_older_than_hours integer DEFAULT 24)
RETURNS TABLE (name text) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public, storage AS $$
  SELECT o.name FROM storage.objects o
   WHERE o.bucket_id = 'job-files' AND o.name LIKE 'pending/%'
     AND o.created_at < now() - make_interval(hours => p_older_than_hours)
   LIMIT 1000;
$$;

-- ---------------------------------------------------------------------------
-- 5. Privileges (deny by default, then grant only what the policies use)
-- ---------------------------------------------------------------------------

REVOKE ALL ON ALL TABLES IN SCHEMA public FROM anon, authenticated;
REVOKE ALL ON ALL SEQUENCES IN SCHEMA public FROM anon, authenticated;
REVOKE EXECUTE ON ALL FUNCTIONS IN SCHEMA public FROM PUBLIC, anon, authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

GRANT EXECUTE ON FUNCTION public.is_admin(), public.owns_job(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION
  public.admin_set_job_status(uuid, text),
  public.admin_send_quotation(uuid, numeric, text, text),
  public.admin_set_payment_link(uuid, text),
  public.admin_mark_paid(uuid, numeric, text, text, text, timestamptz),
  public.admin_mark_files_deleted(uuid),
  public.admin_set_partner_notes(uuid, text)
TO authenticated;

GRANT SELECT ON public.faq_items TO anon, authenticated;
GRANT INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;

GRANT SELECT ON public.profiles TO authenticated;
GRANT UPDATE (full_name, company_name, customer_type, country, phone) ON public.profiles TO authenticated;
GRANT SELECT ON public.partner_notes TO authenticated;

GRANT SELECT ON public.jobs, public.job_files, public.payments, public.job_events TO authenticated;
GRANT INSERT (job_id, kind, file_name, storage_path, size_bytes, mime_type) ON public.job_files TO authenticated;

GRANT SELECT ON public.job_messages TO authenticated;
GRANT INSERT (job_id, sender_role, body) ON public.job_messages TO authenticated;
GRANT UPDATE (customer_read_at, admin_read_at) ON public.job_messages TO authenticated;

GRANT SELECT ON public.job_notes TO authenticated;
GRANT INSERT (job_id, body) ON public.job_notes TO authenticated;

GRANT SELECT ON public.data_deletion_requests TO authenticated;
GRANT INSERT (details) ON public.data_deletion_requests TO authenticated;
GRANT UPDATE (status, processed_at) ON public.data_deletion_requests TO authenticated;

GRANT SELECT ON public.contact_messages TO authenticated;
GRANT UPDATE (status) ON public.contact_messages TO authenticated;
GRANT SELECT ON public.partner_requests TO authenticated;
GRANT UPDATE (status, reviewed_at) ON public.partner_requests TO authenticated;

GRANT SELECT ON public.admin_settings TO authenticated;
GRANT UPDATE (notification_email, retention_days, auto_delete_enabled, templates) ON public.admin_settings TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Row level security policies
-- ---------------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.job_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.data_deletion_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contact_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.partner_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.faq_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rate_limit_hits ENABLE ROW LEVEL SECURITY;

-- profiles
CREATE POLICY profiles_select ON public.profiles FOR SELECT TO authenticated
  USING (id = auth.uid() OR public.is_admin());
CREATE POLICY profiles_update_own ON public.profiles FOR UPDATE TO authenticated
  USING (id = auth.uid()) WITH CHECK (id = auth.uid());

-- partner notes (admin only)
CREATE POLICY partner_notes_admin ON public.partner_notes FOR SELECT TO authenticated USING (public.is_admin());

-- jobs
CREATE POLICY jobs_select ON public.jobs FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());

-- job files
CREATE POLICY job_files_select ON public.job_files FOR SELECT TO authenticated
  USING (public.owns_job(job_id) OR public.is_admin());
CREATE POLICY job_files_insert_additional ON public.job_files FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'additional'
    AND EXISTS (
      SELECT 1 FROM public.jobs j
       WHERE j.id = job_files.job_id AND j.user_id = auth.uid() AND j.status = 'Awaiting Information'
         AND job_files.storage_path LIKE j.reference || '/additional/%'
    )
  );
CREATE POLICY job_files_insert_completed ON public.job_files FOR INSERT TO authenticated
  WITH CHECK (
    kind = 'completed' AND public.is_admin()
    AND EXISTS (SELECT 1 FROM public.jobs j WHERE j.id = job_files.job_id AND job_files.storage_path LIKE j.reference || '/completed/%')
  );

-- payments
CREATE POLICY payments_select ON public.payments FOR SELECT TO authenticated
  USING (public.owns_job(job_id) OR public.is_admin());

-- messages
CREATE POLICY job_messages_select ON public.job_messages FOR SELECT TO authenticated
  USING (public.owns_job(job_id) OR public.is_admin());
CREATE POLICY job_messages_insert_customer ON public.job_messages FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'customer' AND sender_id = auth.uid() AND public.owns_job(job_id));
CREATE POLICY job_messages_insert_admin ON public.job_messages FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'admin' AND sender_id = auth.uid() AND public.is_admin());
CREATE POLICY job_messages_mark_read ON public.job_messages FOR UPDATE TO authenticated
  USING (public.owns_job(job_id) OR public.is_admin())
  WITH CHECK (public.owns_job(job_id) OR public.is_admin());

-- internal notes and activity log (admin only)
CREATE POLICY job_notes_select ON public.job_notes FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY job_notes_insert ON public.job_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_admin() AND author_id = auth.uid());
CREATE POLICY job_events_select ON public.job_events FOR SELECT TO authenticated USING (public.is_admin());

-- GDPR deletion requests
CREATE POLICY deletion_select ON public.data_deletion_requests FOR SELECT TO authenticated
  USING (user_id = auth.uid() OR public.is_admin());
CREATE POLICY deletion_insert ON public.data_deletion_requests FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());
CREATE POLICY deletion_update ON public.data_deletion_requests FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- contact and partner requests (written by server functions, reviewed by admin)
CREATE POLICY contact_select ON public.contact_messages FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY contact_update ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY partner_requests_select ON public.partner_requests FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY partner_requests_update ON public.partner_requests FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- FAQ (public read, admin write)
CREATE POLICY faq_select ON public.faq_items FOR SELECT TO anon, authenticated USING (true);
CREATE POLICY faq_insert ON public.faq_items FOR INSERT TO authenticated WITH CHECK (public.is_admin());
CREATE POLICY faq_update ON public.faq_items FOR UPDATE TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());
CREATE POLICY faq_delete ON public.faq_items FOR DELETE TO authenticated USING (public.is_admin());

-- settings (admin only)
CREATE POLICY settings_select ON public.admin_settings FOR SELECT TO authenticated USING (public.is_admin());
CREATE POLICY settings_update ON public.admin_settings FOR UPDATE TO authenticated
  USING (public.is_admin()) WITH CHECK (public.is_admin());

-- rate_limit_hits: no policies, server only.

-- ---------------------------------------------------------------------------
-- 7. Private storage bucket, organised by job reference
--    pending/<draft-id>/...          uploads while a submission is in progress
--    ZOM-000001/original/...         moved here by the submit-job function
--    ZOM-000001/additional/...       customer uploads while Awaiting Information
--    ZOM-000001/completed/...        admin uploads, readable by the customer only once paid and delivered
-- ---------------------------------------------------------------------------

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('job-files', 'job-files', false, 104857600)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

CREATE POLICY job_files_upload_pending ON storage.objects FOR INSERT TO anon, authenticated
  WITH CHECK (
    bucket_id = 'job-files'
    AND (storage.foldername(name))[1] = 'pending'
    AND (storage.foldername(name))[2] ~ '^[0-9a-f-]{36}$'
    AND array_length(storage.foldername(name), 1) = 2
  );

CREATE POLICY job_files_upload_additional ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'job-files'
    AND (storage.foldername(name))[2] = 'additional'
    AND EXISTS (
      SELECT 1 FROM public.jobs j
       WHERE j.reference = (storage.foldername(name))[1] AND j.user_id = auth.uid() AND j.status = 'Awaiting Information'
    )
  );

CREATE POLICY job_files_upload_completed ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'job-files' AND (storage.foldername(name))[2] = 'completed' AND public.is_admin());

CREATE POLICY job_files_read ON storage.objects FOR SELECT TO authenticated
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
             OR ((storage.foldername(name))[2] = 'completed' AND j.payment_status = 'paid' AND j.status = 'Delivered')
           )
      )
    )
  );

CREATE POLICY job_files_admin_delete ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'job-files' AND public.is_admin());
