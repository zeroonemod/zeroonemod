import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Download, Lock } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { FileDownloadList, FileUploader } from '@/features/jobs/JobFileActions';
import { JobMessages } from '@/features/jobs/JobMessages';
import { formatDate, formatMoney } from '@/features/jobs/jobFormat';
import { StatusBadge, StatusStepper } from '@/features/jobs/JobStatusViews';
import { JOB_COLUMNS, SERVICE_LABELS, type JobFileRow, type JobRow } from '@/features/jobs/jobTypes';
import { supabase } from '@/lib/supabase';

interface LoadedJob {
  job: JobRow;
  files: JobFileRow[];
}

const FILE_COLUMNS = 'id, job_id, kind, file_name, storage_path, size_bytes, created_at';

async function loadJob(reference: string): Promise<LoadedJob | 'not_found' | 'error'> {
  const { data, error } = await supabase.from('jobs').select(JOB_COLUMNS).eq('reference', reference).maybeSingle();
  if (error) return 'error';
  if (!data) return 'not_found';
  const job = data as unknown as JobRow;

  const { data: fileData, error: fileError } = await supabase
    .from('job_files')
    .select(FILE_COLUMNS)
    .eq('job_id', job.id)
    .order('created_at', { ascending: true });
  if (fileError || !Array.isArray(fileData)) return 'error';

  return { job, files: fileData as unknown as JobFileRow[] };
}

export function CustomerJobDetail({ reference }: { reference: string }) {
  const [loaded, setLoaded] = useState<LoadedJob | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');

  const refresh = useCallback(async () => {
    const result = await loadJob(reference);
    if (result === 'not_found' || result === 'error') {
      setState(result);
      return;
    }
    setLoaded(result);
    setState('ready');
  }, [reference]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === 'loading') return <LoadingState label="Loading your job" />;

  if (state === 'error' || state === 'not_found' || !loaded) {
    return (
      <div className="flex flex-col gap-6">
        <BackLink />
        <p role="alert" className="rounded-xl border border-red-500/30 bg-red-500/5 p-6 text-sm text-red-300">
          {state === 'not_found'
            ? 'We could not find this job. It may have been removed or the link is incorrect.'
            : 'We could not load this job. Please refresh the page and try again.'}
        </p>
      </div>
    );
  }

  const { job, files } = loaded;
  const originals = files.filter((file) => file.kind === 'original');
  const completed = files.filter((file) => file.kind === 'completed');
  const additional = files.filter((file) => file.kind === 'additional');
  const isPaid = job.payment_status === 'paid';
  const canDownload = isPaid && completed.length > 0;
  const canPay = job.status === 'Awaiting Payment' && !!job.payment_link && !isPaid;

  return (
    <div className="flex flex-col gap-8">
      <BackLink />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex flex-col gap-2">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-500">Job reference</p>
          <h1 className="text-3xl font-semibold leading-[1.2] text-white sm:text-4xl">{job.reference}</h1>
          <p className="text-sm text-neutral-400">
            {job.vehicle_year} {job.vehicle_make} {job.vehicle_model} · {job.file_type} ·{' '}
            {SERVICE_LABELS[job.requested_service] ?? job.requested_service}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </header>

      <Card padding="sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Progress</h2>
        <StatusStepper status={job.status} />
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="mb-5 text-lg font-semibold text-white">Submitted information</h2>
          <dl className="grid gap-4 text-sm sm:grid-cols-2">
            <Detail label="Submitted" value={formatDate(job.created_at)} />
            <Detail label="Service" value={SERVICE_LABELS[job.requested_service] ?? job.requested_service} />
            <Detail label="Vehicle" value={`${job.vehicle_year} ${job.vehicle_make} ${job.vehicle_model}`} />
            <Detail label="Engine" value={job.vehicle_engine} />
            <Detail label="ECU manufacturer" value={job.ecu_manufacturer} />
            <Detail label="ECU hardware number" value={job.ecu_hardware_number} />
            <Detail label="ECU software number" value={job.ecu_software_number} />
            <Detail label="VIN" value={job.vehicle_vin} />
          </dl>
          {job.service_comments && (
            <p className="mt-5 whitespace-pre-wrap border-t border-white/[0.08] pt-5 text-sm leading-[1.5] text-neutral-300">
              {job.service_comments}
            </p>
          )}
          <div className="mt-5 border-t border-white/[0.08] pt-5">
            <p className="mb-3 text-sm font-medium text-neutral-200">Your original files</p>
            <FileDownloadList files={originals} emptyText="No original files on this job." />
          </div>
        </Card>

        <div className="flex flex-col gap-6">
          <Card padding="lg">
            <h2 className="mb-5 text-lg font-semibold text-white">Quotation</h2>
            {job.quote_amount !== null ? (
              <div className="flex flex-col gap-3">
                <p className="text-3xl font-semibold text-white">{formatMoney(job.quote_amount, job.quote_currency)}</p>
                {job.quoted_at && <p className="text-xs text-neutral-500">Sent {formatDate(job.quoted_at)}</p>}
                {job.quote_notes && <p className="whitespace-pre-wrap text-sm leading-[1.5] text-neutral-300">{job.quote_notes}</p>}
              </div>
            ) : (
              <p className="text-sm text-neutral-400">No quotation yet. We will let you know as soon as it is ready.</p>
            )}
          </Card>

          <Card padding="lg">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
              <CreditCard className="h-5 w-5" aria-hidden="true" />
              Payment
            </h2>
            <div className="flex flex-col gap-5">
              <p className="text-sm text-neutral-300">
                {isPaid
                  ? `Paid${job.paid_at ? ` on ${formatDate(job.paid_at)}` : ''}. Thank you.`
                  : canPay
                    ? 'Your quotation is ready to pay. The payment page opens in a new tab.'
                    : 'Not paid yet. Payment becomes available once your quotation is ready.'}
              </p>
              {canPay && (
                <a
                  href={job.payment_link ?? undefined}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex h-12 items-center justify-center rounded-lg bg-red-600 px-6 text-sm font-semibold tracking-wide text-white transition-colors duration-200 hover:bg-red-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-canvas"
                >
                  PAY NOW
                </a>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
              <Download className="h-5 w-5" aria-hidden="true" />
              Your modified file
            </h2>
            {canDownload ? (
              <FileDownloadList files={completed} emptyText="No modified file yet." />
            ) : (
              <div className="flex items-center gap-3 rounded-lg border border-dashed border-white/15 px-4 py-4 text-sm text-neutral-400">
                <Lock className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>{isPaid ? 'Your modified file will appear here when it is ready.' : 'Available after payment'}</span>
              </div>
            )}
          </Card>
        </div>
      </div>

      {job.status === 'Awaiting Information' && (
        <Card padding="lg">
          <FileUploader
            jobId={job.id}
            reference={job.reference}
            kind="additional"
            title="Send additional files"
            description="We need more information about this file. Upload any extra files, such as a second ECU read or a photo of the label."
            onUploaded={() => void refresh()}
          />
          {additional.length > 0 && (
            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <p className="mb-3 text-sm font-medium text-neutral-200">Files you sent</p>
              <FileDownloadList files={additional} emptyText="" />
            </div>
          )}
        </Card>
      )}

      <Card padding="lg">
        <h2 className="mb-5 text-lg font-semibold text-white">Messages</h2>
        <JobMessages jobId={job.id} viewer="customer" />
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link
      to="/dashboard"
      className="inline-flex w-fit items-center gap-2 text-sm text-neutral-400 transition-colors duration-200 hover:text-white"
    >
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to my jobs
    </Link>
  );
}

function Detail({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className="break-words text-neutral-100">{value || '-'}</dd>
    </div>
  );
}
