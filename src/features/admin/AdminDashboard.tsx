import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle2, Clock, CreditCard, FileSearch, Inbox, Mail } from 'lucide-react';
import { IconBadge } from '@/components/ui/IconBadge';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { useAdminJobs } from '@/features/admin/useAdminJobs';
import { AdminPageHeader, EmptyRow } from '@/features/admin/adminShared';
import { formatDate } from '@/features/jobs/jobFormat';
import { contactLabel, SERVICE_LABELS, vehicleLabel, type JobRow } from '@/features/jobs/jobTypes';
import { useMessageThreads } from '@/features/jobs/useMessageThreads';

const WEEK_MS = 7 * 86_400_000;

function actionReason(job: JobRow, unread: number): string | null {
  if (job.job_type === 'guest' && job.status === 'Submitted') return 'New guest request';
  if (unread > 0) return `${unread} unread customer message${unread === 1 ? '' : 's'}`;
  switch (job.status) {
    case 'Submitted':
      return 'New submission to review';
    case 'Under Review':
      return 'Under review, needs a quotation';
    case 'Quotation Sent':
      return job.payment_link ? null : 'Quotation sent, add a payment link';
    case 'In Progress':
      return job.payment_status === 'paid' ? 'Paid, work on the file' : null;
    case 'Completed':
      return job.payment_status === 'paid' ? 'Completed, ready to deliver' : 'Completed, waiting for payment';
    default:
      return null;
  }
}

export function AdminDashboard() {
  const { jobs, error, reload } = useAdminJobs();
  const { threads } = useMessageThreads('admin');

  const unreadByJob = useMemo(() => Object.fromEntries((threads ?? []).map((t) => [t.jobId, t.unread])), [threads]);

  const counters = useMemo(() => {
    const list = jobs ?? [];
    const weekAgo = Date.now() - WEEK_MS;
    return [
      { label: 'New submissions', value: list.filter((j) => j.status === 'Submitted').length, icon: Inbox },
      { label: 'Awaiting review', value: list.filter((j) => j.status === 'Under Review').length, icon: FileSearch },
      {
        label: 'Awaiting payment',
        value: list.filter((j) => (j.status === 'Awaiting Payment' || j.status === 'Quotation Sent') && j.payment_status !== 'paid').length,
        icon: CreditCard,
      },
      { label: 'In progress', value: list.filter((j) => j.status === 'In Progress').length, icon: Clock },
      {
        label: 'Completed this week',
        value: list.filter((j) => (j.status === 'Completed' || j.status === 'Delivered') && new Date(j.updated_at).getTime() >= weekAgo).length,
        icon: CheckCircle2,
      },
    ];
  }, [jobs]);

  const needsAction = useMemo(
    () =>
      (jobs ?? [])
        .map((job) => ({ job, reason: actionReason(job, unreadByJob[job.id] ?? 0) }))
        .filter((item): item is { job: JobRow; reason: string } => item.reason !== null),
    [jobs, unreadByJob],
  );

  if (error) {
    return (
      <div className="flex flex-col items-start gap-4">
        <p role="alert" className="text-sm text-red-400">We could not load the dashboard.</p>
        <button type="button" onClick={() => void reload()} className="text-sm text-white underline underline-offset-4">
          Try again
        </button>
      </div>
    );
  }
  if (!jobs) return <LoadingState label="Loading dashboard" />;

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader title="Dashboard" description="Everything that needs your attention, at a glance." />

      <div className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-5">
        {counters.map((counter) => (
          <div key={counter.label} className="rounded-xl border border-white/[0.08] border-t-2 border-t-brand-500/60 bg-surface p-5">
            <IconBadge className="mb-4">
              <counter.icon className="h-5 w-5" />
            </IconBadge>
            <p className="text-xs uppercase tracking-wider text-neutral-500">{counter.label}</p>
            <p className="mt-2 text-3xl font-semibold text-white">{counter.value}</p>
          </div>
        ))}
      </div>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Needs action</h2>
        {needsAction.length === 0 ? (
          <EmptyRow>Nothing needs action right now.</EmptyRow>
        ) : (
          <ul className="flex flex-col gap-3">
            {needsAction.map(({ job, reason }) => (
              <li key={job.id}>
                <Link
                  to={`/admin/jobs/${job.reference}`}
                  className="group flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-surface p-5 transition-colors duration-200 hover:border-brand-500/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 flex-col gap-1">
                    <span className="flex items-center gap-2 text-sm font-semibold">
                      {job.reference}
                      {(unreadByJob[job.id] ?? 0) > 0 && <Mail className="h-4 w-4 text-brand-500" aria-label="Unread messages" />}
                    </span>
                    <span className="break-all text-sm text-neutral-300">
                      {job.job_type === 'guest'
                        ? contactLabel(job)
                        : `${vehicleLabel(job)} · ${SERVICE_LABELS[job.requested_service] ?? job.requested_service}`}
                    </span>
                    <span className="text-xs text-neutral-500">
                      {reason} · {formatDate(job.created_at)}
                    </span>
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
