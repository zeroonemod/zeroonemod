import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

export interface MessageThread {
  jobId: string;
  reference: string;
  customer: string;
  vehicle: string;
  lastBody: string;
  lastAt: string;
  lastFrom: 'customer' | 'admin';
  unread: number;
  total: number;
}

/**
 * One thread per job with its latest message and the number of messages
 * the viewer has not read yet. Row level security limits customers to their own jobs.
 */
export function useMessageThreads(viewer: 'customer' | 'admin') {
  const [threads, setThreads] = useState<MessageThread[] | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('job_messages')
      .select('job_id, sender_role, body, created_at, customer_read_at, admin_read_at, jobs!inner(reference, customer_first_name, customer_last_name, vehicle_year, vehicle_make, vehicle_model)')
      .order('created_at', { ascending: false })
      .limit(1000);
    if (queryError || !Array.isArray(data)) {
      setError(true);
      return;
    }
    const byJob = new Map<string, MessageThread>();
    for (const row of data as unknown as MessageRowWithJob[]) {
      const job = Array.isArray(row.jobs) ? row.jobs[0] : row.jobs;
      if (!job) continue;
      let thread = byJob.get(row.job_id);
      if (!thread) {
        thread = {
          jobId: row.job_id,
          reference: job.reference,
          customer: [job.customer_first_name, job.customer_last_name].filter(Boolean).join(' ') || 'Guest',
          vehicle: `${job.vehicle_year} ${job.vehicle_make} ${job.vehicle_model}`,
          lastBody: row.body,
          lastAt: row.created_at,
          lastFrom: row.sender_role,
          unread: 0,
          total: 0,
        };
        byJob.set(row.job_id, thread);
      }
      thread.total += 1;
      const fromOtherSide = row.sender_role !== viewer;
      const readAt = viewer === 'customer' ? row.customer_read_at : row.admin_read_at;
      if (fromOtherSide && !readAt) thread.unread += 1;
    }
    setError(false);
    setThreads([...byJob.values()]);
  }, [viewer]);

  useEffect(() => {
    void reload();
  }, [reload]);

  const unreadTotal = (threads ?? []).reduce((sum, thread) => sum + thread.unread, 0);
  return { threads, error, reload, unreadTotal };
}

interface ThreadJob {
  reference: string;
  customer_first_name: string | null;
  customer_last_name: string | null;
  vehicle_year: number;
  vehicle_make: string;
  vehicle_model: string;
}

interface MessageRowWithJob {
  job_id: string;
  sender_role: 'customer' | 'admin';
  body: string;
  created_at: string;
  customer_read_at: string | null;
  admin_read_at: string | null;
  jobs:
    | ThreadJob
    | ThreadJob[]
    | null;
}
