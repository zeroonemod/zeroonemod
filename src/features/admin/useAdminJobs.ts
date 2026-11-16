import { useCallback, useEffect, useState } from 'react';
import { JOB_COLUMNS, type JobRow } from '@/features/jobs/jobTypes';
import { supabase } from '@/lib/supabase';

export function useAdminJobs() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    const { data, error: queryError } = await supabase.from('jobs').select(JOB_COLUMNS).order('created_at', { ascending: false }).limit(5000);
    if (queryError || !Array.isArray(data)) {
      setError(true);
      return;
    }
    setError(false);
    setJobs(data as unknown as JobRow[]);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { jobs, error, reload };
}
