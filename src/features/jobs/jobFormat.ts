import type { JobStatus } from '@/features/jobs/jobTypes';

export function formatMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(amount);
}

export function formatDate(value: string): string {
  return new Intl.DateTimeFormat('en-GB', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function formatDateTime(value: string): string {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

export function statusBadgeClass(status: JobStatus): string {
  if (status === 'Delivered' || status === 'Completed') return 'border-white/60 text-white';
  if (status === 'Awaiting Payment' || status === 'Awaiting Information') return 'border-brand-500 text-brand-400';
  return 'border-white/20 text-neutral-200';
}
