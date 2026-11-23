import { useCallback, useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, CreditCard, Download, ExternalLink, Lock } from 'lucide-react';
import { buttonClasses } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { StatusStepper } from '@/components/ui/Stepper';
import { notify } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { FileDownloadList, FileUploader } from '@/features/jobs/JobFileActions';
import { JobVehicleDetails } from '@/features/jobs/JobInfo';
import { JobMessages } from '@/features/jobs/JobMessages';
import { formatDate, formatMoney } from '@/features/jobs/jobFormat';
import { FILE_COLUMNS, JOB_COLUMNS, JOB_STATUSES, SERVICE_LABELS, vehicleLabel, type JobFileRow, type JobRow } from '@/features/jobs/jobTypes';

interface LoadedJob {
  job: JobRow;
  files: JobFileRow[];
}

async function loadJob(reference: string): Promise<LoadedJob | 'not_found' | 'error'> {
  const { data, error } = await supabase.from('jobs').select(JOB_COLUMNS).eq('reference', reference).maybeSingle();
  if (error) return 'error';
  if (!data) return 'not_found';
  const job = data as unknown as JobRow;
  const { data: fileData, error: fileError } = await supabase.from('job_files').select(FILE_COLUMNS).eq('job_id', job.id).order('created_at');
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

  if (state !== 'ready' || !loaded) {
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
  const photos = files.filter((file) => file.kind === 'photo');
  const completed = files.filter((file) => file.kind === 'completed');
  const additional = files.filter((file) => file.kind === 'additional');
  const isPaid = job.payment_status === 'paid';
  const isDelivered = job.status === 'Delivered';
  const canDownload = isPaid && isDelivered && completed.length > 0;
  const canPay = !isPaid && Boolean(job.payment_link) && (job.status === 'Awaiting Payment' || job.status === 'Quotation Sent');

  return (
    <div className="flex flex-col gap-8">
      <BackLink />

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <p className="eyebrow">Job reference</p>
          <h1 className="text-3xl font-semibold leading-[1.2] text-white sm:text-4xl">{job.reference}</h1>
          <p className="text-sm text-neutral-400">
            {vehicleLabel(job)} · {job.file_type} · {SERVICE_LABELS[job.requested_service] ?? job.requested_service}
          </p>
        </div>
        <StatusBadge status={job.status} />
      </header>

      <Card padding="sm">
        <h2 className="mb-4 text-sm font-semibold uppercase tracking-[0.14em] text-neutral-400">Progress</h2>
        <StatusStepper steps={JOB_STATUSES} current={job.status} />
      </Card>

      {job.status === 'Awaiting Information' && (
        <Card padding="lg" className="border-brand-500/40">
          <h2 className="mb-2 text-lg font-semibold text-white">We need more information</h2>
          <p className="mb-5 text-sm leading-[1.5] text-neutral-400">Please read our message below and upload any extra files we asked for.</p>
          <FileUploader
            jobId={job.id}
            reference={job.reference}
            kind="additional"
            title="Upload additional files"
            description="For example a second ECU read or a photo of the label. Any format, up to 100 MB per file."
            onUploaded={() => {
              notify(job.id, 'additional_files');
              void refresh();
            }}
          />
          {additional.length > 0 && (
            <div className="mt-6 border-t border-white/[0.08] pt-5">
              <p className="mb-3 text-sm font-medium text-neutral-200">Files you sent</p>
              <FileDownloadList files={additional} emptyText="" />
            </div>
          )}
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        <Card padding="lg">
          <h2 className="mb-5 text-lg font-semibold text-white">Submitted information</h2>
          <JobVehicleDetails job={job} />
          {job.service_comments && (
            <p className="mt-5 whitespace-pre-wrap border-t border-white/[0.08] pt-5 text-sm leading-[1.5] text-neutral-300">{job.service_comments}</p>
          )}
          <div className="mt-5 border-t border-white/[0.08] pt-5">
            <p className="mb-3 text-sm font-medium text-neutral-200">Your original files</p>
            <FileDownloadList
              files={originals}
              emptyText={job.files_deleted_at ? 'Files were removed under our retention policy.' : 'No original files on this job.'}
            />
            {photos.length > 0 && (
              <>
                <p className="mb-3 mt-5 text-sm font-medium text-neutral-200">Hardware photos</p>
                <FileDownloadList files={photos} emptyText="" />
              </>
            )}
            {job.status !== 'Awaiting Information' && additional.length > 0 && (
              <>
                <p className="mb-3 mt-5 text-sm font-medium text-neutral-200">Additional files</p>
                <FileDownloadList files={additional} emptyText="" />
              </>
            )}
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
              <CreditCard className="h-5 w-5 text-brand-500" aria-hidden="true" />
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
              {canPay && job.payment_link && (
                <a href={job.payment_link} target="_blank" rel="noopener noreferrer" className={buttonClasses('primary', 'lg', 'w-full sm:w-auto sm:self-start')}>
                  Pay now
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </a>
              )}
            </div>
          </Card>

          <Card padding="lg">
            <h2 className="mb-5 flex items-center gap-2 text-lg font-semibold text-white">
              <Download className="h-5 w-5 text-brand-500" aria-hidden="true" />
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

      <Card padding="lg">
        <h2 id="messages" className="mb-5 scroll-mt-24 text-lg font-semibold text-white">
          Messages
        </h2>
        <JobMessages jobId={job.id} viewer="customer" />
      </Card>
    </div>
  );
}

function BackLink() {
  return (
    <Link to="/dashboard" className="inline-flex w-fit items-center gap-2 text-sm text-neutral-400 transition-colors duration-200 hover:text-white">
      <ArrowLeft className="h-4 w-4" aria-hidden="true" />
      Back to my jobs
    </Link>
  );
}
