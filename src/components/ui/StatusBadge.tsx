import type { JobStatus } from '@/features/jobs/jobTypes';

function badgeClass(status: JobStatus): string {
  if (status === 'Delivered' || status === 'Completed') return 'border-white/60 text-white';
  if (status === 'Awaiting Payment' || status === 'Awaiting Information') return 'border-brand-500 text-brand-400';
  return 'border-white/20 text-neutral-200';
}

export function StatusBadge({ status }: { status: JobStatus }) {
  const isDone = status === 'Delivered' || status === 'Completed';
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${badgeClass(status)}`}>
      {isDone && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
      {status}
    </span>
  );
}
