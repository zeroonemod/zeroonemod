import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, Briefcase, Clock, CreditCard, FolderOpen, Mail } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAdminJobs } from '@/features/admin/useAdminJobs';
import { formatDate } from '@/features/jobs/jobFormat';
import { StatusBadge } from '@/features/jobs/JobStatusViews';
import { SERVICE_LABELS, type JobRow } from '@/features/jobs/jobTypes';
import { supabase } from '@/lib/supabase';

const ACTION_REASONS: Record<string, string> = {
  Submitted: 'New submission to review',
  'Under Review': 'Under review, needs a quotation',
  'Awaiting Information': 'Waiting for the customer',
  Completed: 'Completed, ready to deliver',
};

function actionReason(job: JobRow, unread: number): string | null {
  if (unread > 0) return `${unread} unread customer message${unread === 1 ? '' : 's'}`;
  if (job.status === 'Completed' && job.payment_status !== 'paid') return 'Completed, waiting for payment';
  if (job.status === 'Completed') return ACTION_REASONS.Completed;
  return ACTION_REASONS[job.status] ?? null;
}

export function AdminDashboard() {
  const { jobs, error, reload } = useAdminJobs();
  const [unreadByJob, setUnreadByJob] = useState<Record<string, number>>({});

  useEffect(() => {
    let active = true;
    supabase
      .from('job_messages')
      .select('job_id')
      .eq('sender_role', 'customer')
      .is('admin_read_at', null)
      .then(({ data }) => {
        if (!active || !Array.isArray(data)) return;
        const counts: Record<string, number> = {};
        for (const row of data as { job_id: string }[]) {
          counts[row.job_id] = (counts[row.job_id] ?? 0) + 1;
        }
        setUnreadByJob(counts);
      });
    return () => {
      active = false;
    };
  }, []);

  const stats = useMemo(() => {
    const list = jobs ?? [];
    return {
      total: list.length,
      open: list.filter((job) => job.status !== 'Delivered').length,
      awaitingPayment: list.filter((job) => job.status === 'Awaiting Payment' || job.status === 'Quotation Sent').length,
      inProgress: list.filter((job) => job.status === 'In Progress').length,
    };
  }, [jobs]);

  const needsAction = useMemo(() => {
    return (jobs ?? [])
      .map((job) => ({ job, reason: actionReason(job, unreadByJob[job.id] ?? 0) }))
      .filter((item): item is { job: JobRow; reason: string } => item.reason !== null);
  }, [jobs, unreadByJob]);

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-red-400">We could not load the dashboard.</p>
        <button type="button" onClick={() => void reload()} className="text-sm text-white underline underline-offset-4">Try again</button>
      </div>
    );
  }

  if (!jobs) return <LoadingState label="Loading dashboard" />;

  const counters = [
    { label: 'All jobs', value: stats.total, icon: Briefcase },
    { label: 'Open jobs', value: stats.open, icon: FolderOpen },
    { label: 'Awaiting payment', value: stats.awaitingPayment, icon: CreditCard },
    { label: 'In progress', value: stats.inProgress, icon: Clock },
  ];

  return (
    <div className="flex flex-col gap-10">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold leading-[1.2] sm:text-4xl">Dashboard</h1>
        <p className="text-sm leading-[1.5] text-neutral-400">Everything that needs your attention, at a glance.</p>
      </header>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {counters.map((counter) => (
          <div key={counter.label} className="rounded-xl border border-white/[0.08] border-t-2 border-t-brand-500/60 bg-surface p-5 sm:p-6">
            <IconBadge className="mb-5">
              <counter.icon className="h-5 w-5" />
            </IconBadge>
            <p className="text-xs uppercase tracking-wider text-neutral-500">{counter.label}</p>
            <p className="mt-3 text-3xl font-semibold text-white">{counter.value}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Needs action</h2>
        {needsAction.length === 0 ? (
          <p className="rounded-xl border border-white/[0.08] bg-surface p-6 text-sm text-neutral-400">Nothing needs action right now.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {needsAction.map(({ job, reason }) => (
              <li key={job.id}>
                <Link
                  to={`/admin/jobs/${job.reference}`}
                  className="group flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-surface p-5 transition-colors duration-200 hover:border-white/25 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {job.reference}
                      {unreadByJob[job.id] > 0 && <Mail className="h-4 w-4 text-red-400" aria-label="Unread messages" />}
                    </span>
                    <span className="text-sm text-neutral-300">
                      {job.vehicle_year} {job.vehicle_make} {job.vehicle_model} · {SERVICE_LABELS[job.requested_service] ?? job.requested_service}
                    </span>
                    <span className="text-xs text-neutral-500">{reason} · {formatDate(job.created_at)}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    <StatusBadge status={job.status} />
                    <ArrowRight className="h-4 w-4 text-neutral-500 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:text-white" aria-hidden="true" />
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
