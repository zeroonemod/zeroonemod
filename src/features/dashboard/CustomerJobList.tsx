import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingState } from '@/components/ui/LoadingState';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectInput } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/features/jobs/jobFormat';
import { JOB_COLUMNS, JOB_STATUSES, SERVICE_LABELS, vehicleLabel, type JobRow, type JobStatus } from '@/features/jobs/jobTypes';

const STATUS_OPTIONS = [{ value: 'all', label: 'All statuses' }, ...JOB_STATUSES.map((status) => ({ value: status, label: status }))];

export function CustomerJobList() {
  const [jobs, setJobs] = useState<JobRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | JobStatus>('all');

  useEffect(() => {
    let active = true;
    supabase
      .from('jobs')
      .select(JOB_COLUMNS)
      .order('created_at', { ascending: false })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !Array.isArray(data)) {
          setLoadError(true);
          return;
        }
        setJobs(data as unknown as JobRow[]);
      });
    return () => {
      active = false;
    };
  }, []);

  const visibleJobs = useMemo(() => {
    if (!jobs) return [];
    const needle = query.trim().toLowerCase();
    return jobs.filter((job) => {
      if (statusFilter !== 'all' && job.status !== statusFilter) return false;
      if (!needle) return true;
      return [job.reference, job.vehicle_make, job.vehicle_model, String(job.vehicle_year), job.vehicle_vin].some((value) =>
        value.toLowerCase().includes(needle),
      );
    });
  }, [jobs, query, statusFilter]);

  if (loadError) {
    return (
      <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
        We could not load your jobs. Please refresh the page and try again.
      </p>
    );
  }

  if (!jobs) return <LoadingState label="Loading your jobs" />;

  return (
    <div className="flex flex-col gap-6">
      <div className="grid gap-4 md:grid-cols-[1fr_260px]">
        <SearchInput
          id="job-search"
          label="Search jobs"
          placeholder="Reference, make, model or VIN"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
        />
        <SelectInput
          id="job-status-filter"
          label="Status"
          value={statusFilter}
          onChange={(event) => setStatusFilter(event.target.value as 'all' | JobStatus)}
          options={STATUS_OPTIONS}
        />
      </div>

      {jobs.length === 0 && (
        <div className="rounded-xl border border-white/[0.08] bg-surface p-8 text-center">
          <p className="text-base text-white">You have not submitted any files yet.</p>
          <p className="mt-2 text-sm text-neutral-400">Your jobs will appear here once you submit a file.</p>
        </div>
      )}

      {jobs.length > 0 && visibleJobs.length === 0 && <p className="text-sm text-neutral-400">No jobs match your search.</p>}

      {visibleJobs.length > 0 && (
        <ul className="flex flex-col gap-3">
          {visibleJobs.map((job) => (
            <li key={job.id}>
              <Link
                to={`/dashboard/jobs/${job.reference}`}
                className="group flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-surface p-5 transition-colors duration-200 hover:border-brand-500/50 sm:flex-row sm:items-center sm:justify-between sm:p-6"
              >
                <div className="flex min-w-0 flex-col gap-1.5">
                  <span className="text-sm font-semibold tracking-wide text-white">{job.reference}</span>
                  <span className="text-sm text-neutral-300">{vehicleLabel(job)}</span>
                  <span className="text-xs text-neutral-500">
                    {job.file_type} · {SERVICE_LABELS[job.requested_service] ?? job.requested_service} · Submitted {formatDate(job.created_at)}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={job.status} />
                  <span className="text-sm text-neutral-500 transition-colors group-hover:text-white" aria-hidden="true">
                    View
                  </span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
