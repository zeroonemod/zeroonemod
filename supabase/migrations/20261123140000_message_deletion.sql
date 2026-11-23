/*
# Deleting messages (admin only)

Plain-English summary
- The admin can delete a whole job conversation from the Messages page. The job itself stays;
  the activity log records how many messages were deleted.
- The admin can delete contact form messages.
- Staff, customers and partners cannot delete messages.

Safe to run on the live database.
*/

-- Whole conversation of one job, logged.
CREATE OR REPLACE FUNCTION public.admin_delete_job_messages(p_job uuid)
RETURNS integer LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_count integer;
BEGIN
  PERFORM public.require_admin();
  DELETE FROM public.job_messages WHERE job_id = p_job;
  GET DIAGNOSTICS v_count = ROW_COUNT;
  IF v_count > 0 THEN
    PERFORM public.log_job_event(p_job, 'messages_deleted', jsonb_build_object('count', v_count));
  END IF;
  RETURN v_count;
END;
$$;
REVOKE EXECUTE ON FUNCTION public.admin_delete_job_messages(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_delete_job_messages(uuid) TO authenticated;

-- Contact form messages.
GRANT DELETE ON public.contact_messages TO authenticated;
DROP POLICY IF EXISTS contact_delete ON public.contact_messages;
CREATE POLICY contact_delete ON public.contact_messages FOR DELETE TO authenticated USING (public.is_admin());
