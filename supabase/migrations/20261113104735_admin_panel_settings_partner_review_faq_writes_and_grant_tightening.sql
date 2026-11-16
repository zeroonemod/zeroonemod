/*
# Admin panel support, partner review, FAQ writes and grant tightening

Plain English
- Adds a single-row admin settings table (notification email, retention period, reply templates).
- Lets admins review partner requests (status and agreed pricing notes) and read contact messages.
- Lets admins create, edit, delete and reorder FAQ entries.
- Removes broad table privileges that were granted to the anonymous and signed-in browser roles on
  job events, job messages, payments, job notes and data deletion requests. Each role now receives only
  the verbs its row-level policies use, so the policies are no longer the only barrier.

1. New tables
- admin_settings: one row (id = true). notification_email, retention_days (30 to 3650), templates (JSON list of reply templates).

2. Modified tables
- partner_requests: adds pricing_notes; status limited to pending, approved, rejected.

3. Security
- RLS enabled on admin_settings with admin-only select and update policies.
- Admin select and update policies on partner_requests and contact_messages.
- Admin insert, update and delete policies on faq_items (public read policy unchanged).
- Revokes all privileges on job_events, job_messages, payments, job_notes and data_deletion_requests
  from anon and authenticated, then re-grants only the required verbs and columns.
- Admin RPCs remain SECURITY DEFINER and check is_admin() inside the function body.

4. Notes
- Payments are written only through admin_mark_paid, which runs as the function owner, so browsers
  no longer need INSERT on payments.
- Partner arrangements are recorded through admin_mark_paid with method partner_arrangement, which
  sets payment_status to paid. Delivery rules therefore already cover them.
*/

-- 1. Settings
CREATE TABLE IF NOT EXISTS public.admin_settings (
  id boolean PRIMARY KEY DEFAULT true CHECK (id),
  notification_email text,
  retention_days integer NOT NULL DEFAULT 730 CHECK (retention_days BETWEEN 30 AND 3650),
  templates jsonb NOT NULL DEFAULT '[]'::jsonb,
  updated_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.admin_settings (id) VALUES (true) ON CONFLICT (id) DO NOTHING;

ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

REVOKE ALL ON public.admin_settings FROM PUBLIC, anon;
GRANT SELECT ON public.admin_settings TO authenticated;
GRANT UPDATE (notification_email, retention_days, templates, updated_at) ON public.admin_settings TO authenticated;

DROP POLICY IF EXISTS "admin_select_settings" ON public.admin_settings;
CREATE POLICY "admin_select_settings" ON public.admin_settings FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_settings" ON public.admin_settings;
CREATE POLICY "admin_update_settings" ON public.admin_settings FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 2. Partner requests
ALTER TABLE public.partner_requests ADD COLUMN IF NOT EXISTS pricing_notes text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'partner_requests_status_check' AND conrelid = 'public.partner_requests'::regclass
  ) THEN
    ALTER TABLE public.partner_requests
      ADD CONSTRAINT partner_requests_status_check CHECK (status IN ('pending', 'approved', 'rejected'));
  END IF;
END $$;

GRANT SELECT ON public.partner_requests TO authenticated;
GRANT UPDATE (status, pricing_notes) ON public.partner_requests TO authenticated;

DROP POLICY IF EXISTS "admin_select_partner_requests" ON public.partner_requests;
CREATE POLICY "admin_select_partner_requests" ON public.partner_requests FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_partner_requests" ON public.partner_requests;
CREATE POLICY "admin_update_partner_requests" ON public.partner_requests FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 3. Contact messages (admin read and triage)
GRANT SELECT ON public.contact_messages TO authenticated;
GRANT UPDATE (status) ON public.contact_messages TO authenticated;

DROP POLICY IF EXISTS "admin_select_contact_messages" ON public.contact_messages;
CREATE POLICY "admin_select_contact_messages" ON public.contact_messages FOR SELECT
  TO authenticated USING (public.is_admin());

DROP POLICY IF EXISTS "admin_update_contact_messages" ON public.contact_messages;
CREATE POLICY "admin_update_contact_messages" ON public.contact_messages FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

-- 4. FAQ writes
GRANT INSERT, UPDATE, DELETE ON public.faq_items TO authenticated;

DROP POLICY IF EXISTS "admin_insert_faq_items" ON public.faq_items;
CREATE POLICY "admin_insert_faq_items" ON public.faq_items FOR INSERT
  TO authenticated WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_update_faq_items" ON public.faq_items;
CREATE POLICY "admin_update_faq_items" ON public.faq_items FOR UPDATE
  TO authenticated USING (public.is_admin()) WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "admin_delete_faq_items" ON public.faq_items;
CREATE POLICY "admin_delete_faq_items" ON public.faq_items FOR DELETE
  TO authenticated USING (public.is_admin());

-- 5. Grant tightening on operational tables
REVOKE ALL ON public.job_events, public.job_messages, public.payments, public.job_notes, public.data_deletion_requests
  FROM PUBLIC, anon, authenticated;

GRANT SELECT ON public.job_events TO authenticated;
GRANT SELECT ON public.payments TO authenticated;
GRANT SELECT, INSERT ON public.job_messages TO authenticated;
GRANT UPDATE (customer_read_at, admin_read_at) ON public.job_messages TO authenticated;
GRANT SELECT, INSERT ON public.job_notes TO authenticated;
GRANT SELECT ON public.data_deletion_requests TO authenticated;
GRANT INSERT (details) ON public.data_deletion_requests TO authenticated;
GRANT UPDATE (status) ON public.data_deletion_requests TO authenticated;
