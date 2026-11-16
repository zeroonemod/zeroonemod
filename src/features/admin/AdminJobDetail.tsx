import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { supabase } from '@/lib/supabase';
import { Panel, useAdminSettings } from '@/features/admin/adminShared';
import { ActivityPanel, DeliveryPanel, FilesPanel, NotesPanel, PaymentPanel, QuotationPanel, StatusPanel } from '@/features/admin/adminJobPanels';
import { Detail, DetailGrid, JobVehicleDetails } from '@/features/jobs/JobInfo';
import { JobMessages } from '@/features/jobs/JobMessages';
import {
  customerName,
  FILE_COLUMNS,
  JOB_COLUMNS,
  PAYMENT_COLUMNS,
  SERVICE_LABELS,
  vehicleLabel,
  type JobEventRow,
  type JobFileRow,
  type JobRow,
  type PaymentRow,
} from '@/features/jobs/jobTypes';

interface JobBundle {
  job: JobRow;
  files: JobFileRow[];
  payments: PaymentRow[];
  notes: { id: string; body: string; created_at: string }[];
  events: JobEventRow[];
}

async function loadBundle(reference: string): Promise<JobBundle | 'not_found' | 'error'> {
  const { data, error } = await supabase.from('jobs').select(JOB_COLUMNS).eq('reference', reference).maybeSingle();
  if (error) return 'error';
  if (!data) return 'not_found';
  const job = data as unknown as JobRow;
  const [files, payments, notes, events] = await Promise.all([
    supabase.from('job_files').select(FILE_COLUMNS).eq('job_id', job.id).order('created_at'),
    supabase.from('payments').select(PAYMENT_COLUMNS).eq('job_id', job.id).order('paid_at', { ascending: false }),
    supabase.from('job_notes').select('id, body, created_at').eq('job_id', job.id).order('created_at'),
    supabase.from('job_events').select('id, action, details, created_at').eq('job_id', job.id).order('created_at', { ascending: false }),
  ]);
  if (files.error || payments.error || notes.error || events.error) return 'error';
  return {
    job,
    files: (files.data ?? []) as unknown as JobFileRow[],
    payments: (payments.data ?? []) as unknown as PaymentRow[],
    notes: notes.data ?? [],
    events: (events.data ?? []) as JobEventRow[],
  };
}

export function AdminJobDetail() {
  const { reference = '' } = useParams();
  const [bundle, setBundle] = useState<JobBundle | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const { settings } = useAdminSettings();

  const refresh = useCallback(async () => {
    const result = await loadBundle(reference);
    if (typeof result === 'string') {
      setState(result);
      return;
    }
    setBundle(result);
    setState('ready');
  }, [reference]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === 'loading') return <LoadingState label="Loading job" />;
  if (state !== 'ready' || !bundle) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <p role="alert" className="text-sm text-red-400">
          {state === 'not_found' ? 'This job does not exist.' : 'We could not load this job. Please refresh the page.'}
        </p>
      </div>
    );
  }

  const { job, files, payments, notes, events } = bundle;
  const onChanged = () => void refresh();
  // Remount stateful panels when the job changes so their fields show the saved values.
  const version = job.updated_at;

  return (
    <div className="flex flex-col gap-8">
      <BackLink />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Job</p>
          <h1 className="text-3xl font-semibold leading-[1.2] sm:text-4xl">{job.reference}</h1>
          <p className="text-sm text-neutral-400">
            {customerName(job)} · {vehicleLabel(job)} · {job.file_type} · {SERVICE_LABELS[job.requested_service] ?? job.requested_service}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <StatusPanel key={`status-${version}`} job={job} onChanged={onChanged} />

          <Panel title="Customer">
            <DetailGrid>
              <Detail label="Name" value={customerName(job)} />
              <Detail
                label="Email"
                value={
                  <a href={`mailto:${job.customer_email}`} className="break-all hover:text-brand-400">
                    {job.customer_email}
                  </a>
                }
              />
              <Detail label="Phone" value={job.customer_phone} />
              <Detail label="Country" value={job.customer_country} />
              <Detail label="Customer type" value={job.customer_type === 'workshop' ? 'Workshop / Service' : 'Individual'} />
              <Detail label="Company" value={job.company_name} />
            </DetailGrid>
            {job.user_id && (
              <Link to={`/admin/customers/${job.user_id}`} className="mt-5 inline-block text-sm text-white underline underline-offset-4 hover:text-brand-400">
                Open customer account
              </Link>
            )}
          </Panel>

          <Panel title="Vehicle and ECU">
            <JobVehicleDetails job={job} />
            {job.service_comments && (
              <div className="mt-5 border-t border-white/[0.08] pt-5">
                <p className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Customer comments</p>
                <p className="whitespace-pre-wrap break-words text-sm leading-[1.5] text-neutral-200">{job.service_comments}</p>
              </div>
            )}
          </Panel>

          <FilesPanel job={job} files={files} onChanged={onChanged} />

          <Panel title="Messages" id="messages">
            <JobMessages jobId={job.id} viewer="admin" templates={settings?.templates ?? []} />
          </Panel>
        </div>

        <div className="flex min-w-0 flex-col gap-6">
          <QuotationPanel key={`quote-${version}`} job={job} onChanged={onChanged} />
          <PaymentPanel key={`pay-${version}`} job={job} payments={payments} onChanged={onChanged} />
          <DeliveryPanel job={job} completed={files.filter((f) => f.kind === 'completed')} onChanged={onChanged} />
          <NotesPanel jobId={job.id} notes={notes} onChanged={onChanged} />
          <ActivityPanel events={events} />
        </div>
      </div>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/admin/jobs" className="inline-flex w-fit items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      All jobs
    </Link>
  );
}
