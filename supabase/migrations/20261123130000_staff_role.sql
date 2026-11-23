/*
# Staff accounts with limited access

Plain-English summary
- New role 'staff', created only by the admin (Settings → Team) with a temporary password.
  Staff must choose their own password at the first login (must_change_password).
- Staff can: see jobs and their details, files and photos; read and answer job messages (shown to
  the customer as ZEROONEMOD); read contact form messages; change the job status (except
  Delivered) and add internal notes; see the activity log; use the reply templates.
- Staff cannot: see payments, settings, partner requests or other profiles; send quotations or
  payment links; mark as paid; deliver; delete anything; manage accounts. Those stay admin-only
  through the existing is_admin() rules.
- Two-step verification applies to staff the same way (mfa_ok).

Safe to run on the live database.
*/

ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('customer', 'partner', 'staff', 'admin'));

ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS must_change_password boolean NOT NULL DEFAULT false;

-- Admin or staff, active, and past two-step verification when it is switched on.
CREATE OR REPLACE FUNCTION public.is_team()
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'staff') AND is_active)
     AND public.mfa_ok();
$$;
REVOKE EXECUTE ON FUNCTION public.is_team() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_team() TO authenticated, service_role;

-- Called after a staff member chose their own password at the first login.
CREATE OR REPLACE FUNCTION public.clear_must_change_password()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET must_change_password = false WHERE id = auth.uid();
$$;
REVOKE EXECUTE ON FUNCTION public.clear_must_change_password() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.clear_must_change_password() TO authenticated;

-- Reply templates for the message box (settings themselves stay admin-only).
CREATE OR REPLACE FUNCTION public.team_reply_templates()
RETURNS jsonb LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_team() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  RETURN (SELECT templates FROM public.admin_settings WHERE id = true);
END;
$$;
REVOKE EXECUTE ON FUNCTION public.team_reply_templates() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.team_reply_templates() TO authenticated;

-- Status changes: admin and staff. Only the admin may set Delivered (it releases the completed file).
CREATE OR REPLACE FUNCTION public.admin_set_job_status(p_job uuid, p_status text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_job public.jobs%ROWTYPE;
BEGIN
  IF NOT public.is_team() THEN
    RAISE EXCEPTION 'Not authorized' USING ERRCODE = '42501';
  END IF;
  IF p_status NOT IN ('Submitted', 'Under Review', 'Awaiting Information', 'Quotation Sent',
                      'Awaiting Payment', 'In Progress', 'Completed', 'Delivered') THEN
    RAISE EXCEPTION 'Invalid status' USING ERRCODE = '22023';
  END IF;
  IF p_status = 'Delivered' AND NOT public.is_admin() THEN
    RAISE EXCEPTION 'Only the admin can deliver a job' USING ERRCODE = '42501';
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

-- Extra (permissive) policies for the team. Admin-only policies stay as they are.
DROP POLICY IF EXISTS team_select_jobs ON public.jobs;
CREATE POLICY team_select_jobs ON public.jobs FOR SELECT TO authenticated USING (public.is_team());

DROP POLICY IF EXISTS team_select_job_files ON public.job_files;
CREATE POLICY team_select_job_files ON public.job_files FOR SELECT TO authenticated USING (public.is_team());

DROP POLICY IF EXISTS team_select_job_messages ON public.job_messages;
CREATE POLICY team_select_job_messages ON public.job_messages FOR SELECT TO authenticated USING (public.is_team());
DROP POLICY IF EXISTS team_insert_job_messages ON public.job_messages;
CREATE POLICY team_insert_job_messages ON public.job_messages FOR INSERT TO authenticated
  WITH CHECK (sender_role = 'admin' AND sender_id = auth.uid() AND public.is_team());
DROP POLICY IF EXISTS team_mark_read_job_messages ON public.job_messages;
CREATE POLICY team_mark_read_job_messages ON public.job_messages FOR UPDATE TO authenticated
  USING (public.is_team()) WITH CHECK (public.is_team());

DROP POLICY IF EXISTS team_select_job_notes ON public.job_notes;
CREATE POLICY team_select_job_notes ON public.job_notes FOR SELECT TO authenticated USING (public.is_team());
DROP POLICY IF EXISTS team_insert_job_notes ON public.job_notes;
CREATE POLICY team_insert_job_notes ON public.job_notes FOR INSERT TO authenticated
  WITH CHECK (public.is_team() AND author_id = auth.uid());

DROP POLICY IF EXISTS team_select_job_events ON public.job_events;
CREATE POLICY team_select_job_events ON public.job_events FOR SELECT TO authenticated USING (public.is_team());

DROP POLICY IF EXISTS team_select_contact ON public.contact_messages;
CREATE POLICY team_select_contact ON public.contact_messages FOR SELECT TO authenticated USING (public.is_team());
DROP POLICY IF EXISTS team_update_contact ON public.contact_messages;
CREATE POLICY team_update_contact ON public.contact_messages FOR UPDATE TO authenticated
  USING (public.is_team()) WITH CHECK (public.is_team());

-- Staff can open job files and photos (downloads still use short-lived signed links).
DROP POLICY IF EXISTS team_read_job_files ON storage.objects;
CREATE POLICY team_read_job_files ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'job-files' AND (storage.foldername(name))[1] <> 'pending' AND public.is_team());
