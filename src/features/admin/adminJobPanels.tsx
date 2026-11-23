import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { Link2, Loader2, Mail, Trash2 } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TextArea } from '@/components/ui/FormField';
import { SelectInput } from '@/components/ui/Select';
import { callFunction, errorMessage, notify } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { JOB_FILES_BUCKET } from '@/lib/storagePaths';
import { supabase } from '@/lib/supabase';
import { Panel } from '@/features/admin/adminShared';
import { useIsAdmin } from '@/features/auth/RequireAuth';
import { FileDownloadList } from '@/features/jobs/JobFileActions';
import { formatDateTime, formatMoney } from '@/features/jobs/jobFormat';
import {
  JOB_STATUSES,
  PAYMENT_METHOD_LABELS,
  type JobEventRow,
  type JobFileRow,
  type JobRow,
  type JobStatus,
} from '@/features/jobs/jobTypes';

interface PanelProps {
  job: JobRow;
  onChanged: () => void;
}

export async function runRpc(name: string, params: Record<string, unknown>) {
  const { error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ status */

export function StatusPanel({ job, onChanged }: PanelProps) {
  return (
    <Panel title="Status">
      <StatusControl job={job} onChanged={onChanged} />
    </Panel>
  );
}

/** Status select with the Completed confirmation; used by the staff Status panel and inside Job progress. */
export function StatusControl({ job, onChanged }: PanelProps) {
  const isAdmin = useIsAdmin();
  const statusOptions = JOB_STATUSES.filter((value) => isAdmin || value !== 'Delivered' || job.status === 'Delivered');
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirming, setConfirming] = useState(false);

  const save = async () => {
    if (status === job.status) return;
    setConfirming(false);
    setBusy(true);
    setNotice(null);
    try {
      await runRpc('admin_set_job_status', { p_job: job.id, p_status: status });
      notify(job.id, status === 'Delivered' ? 'delivered' : 'status_changed');
      setNotice({ tone: 'success', text: 'Status updated. The customer has been emailed.' });
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
      setStatus(job.status);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectInput
            id="admin-status"
            label="Job status"
            value={status}
            onChange={(event) => {
              setStatus(event.target.value as JobStatus);
              setConfirming(false);
            }}
            options={statusOptions.map((value) => ({ value, label: value }))}
          />
        </div>
        <Button
          onClick={() => (status === 'Completed' ? setConfirming(true) : save())}
          disabled={busy || confirming || status === job.status}
        >
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Update status
        </Button>
      </div>
      {confirming && (
        <div role="group" aria-label="Confirm status" className="mt-4 flex flex-col gap-3 rounded-lg border border-brand-500/40 bg-brand-500/[0.06] p-4">
          <p className="text-sm leading-[1.5] text-neutral-100">
            Mark {job.reference} as <span className="font-semibold text-white">Completed</span>? The customer is emailed that the job is done.
          </p>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button variant="ghost" size="sm" onClick={() => setConfirming(false)} autoFocus>
              Cancel
            </Button>
            <Button size="sm" onClick={save}>
              Yes, mark as completed
            </Button>
          </div>
        </div>
      )}
      <div className="mt-3">
        <NoticeLine notice={notice} />
      </div>
    </div>
  );
}

const SECURE_LINK_DAYS = 7;

/** Customers without an account cannot download from a dashboard: send or copy a time-limited link instead. */
export function SecureLinkActions({ job, completed, ready }: { job: JobRow; completed: JobFileRow[]; ready: boolean }) {
  const [busy, setBusy] = useState<'email' | 'copy' | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const email = job.customer_email as string | null;

  const sendEmail = async () => {
    setBusy('email');
    setNotice(null);
    try {
      const result = await callFunction<{ sent: boolean }>('notify', { jobId: job.id, event: 'download_link' });
      setNotice(
        result.sent
          ? { tone: 'success', text: `Secure download link emailed to ${email}. It is valid for ${SECURE_LINK_DAYS} days.` }
          : { tone: 'error', text: 'The email was not sent (email sending is not set up yet). Copy the link instead.' },
      );
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  const copyLink = async () => {
    setBusy('copy');
    setNotice(null);
    try {
      const links: string[] = [];
      for (const file of completed) {
        const { data, error } = await supabase.storage
          .from(JOB_FILES_BUCKET)
          .createSignedUrl(file.storage_path, SECURE_LINK_DAYS * 86_400, { download: file.file_name });
        if (error || !data) throw new Error('The link could not be created.');
        links.push(completed.length > 1 ? `${file.file_name}: ${data.signedUrl}` : data.signedUrl);
      }
      if (!(await copyText(links.join('\n')))) throw new Error('The link could not be copied. Please try again.');
      setNotice({ tone: 'success', text: `Secure link copied. It is valid for ${SECURE_LINK_DAYS} days.` });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-5">
      <p className="text-sm text-neutral-400">
        This customer has no account. Send the completed file as a secure link, valid for {SECURE_LINK_DAYS} days.
      </p>
      <div className="flex flex-col gap-2 sm:flex-row">
        <Button variant="secondary" size="sm" onClick={sendEmail} disabled={!ready || !email || busy !== null}>
          {busy === 'email' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Mail className="h-3.5 w-3.5" aria-hidden="true" />}
          Email secure link
        </Button>
        <Button variant="secondary" size="sm" onClick={copyLink} disabled={!ready || busy !== null}>
          {busy === 'copy' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Link2 className="h-3.5 w-3.5" aria-hidden="true" />}
          Copy secure link
        </Button>
      </div>
      {!ready && <p className="text-xs text-neutral-500">Available once the job is paid and a completed file is uploaded.</p>}
      <NoticeLine notice={notice} />
    </div>
  );
}

/* ------------------------------------------------------------------- files */

export function FilesPanel({ job, files, onChanged, canManage = true }: PanelProps & { files: JobFileRow[]; canManage?: boolean }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const originals = files.filter((f) => f.kind === 'original');
  const photos = files.filter((f) => f.kind === 'photo');
  const additional = files.filter((f) => f.kind === 'additional');
  const completed = files.filter((f) => f.kind === 'completed');

  const deleteAll = async () => {
    setBusy(true);
    setNotice(null);
    try {
      const paths = files.map((f) => f.storage_path);
      if (paths.length > 0) {
        const { error } = await supabase.storage.from(JOB_FILES_BUCKET).remove(paths);
        if (error) throw new Error(error.message);
      }
      await runRpc('admin_mark_files_deleted', { p_job: job.id });
      setNotice({ tone: 'success', text: 'All files deleted.' });
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel
      title="Files"
      actions={
        canManage && files.length > 0 ? (
          <ConfirmButton
            variant="ghost"
            busy={busy}
            message={`Permanently delete all ${files.length} file${files.length === 1 ? '' : 's'} of ${job.reference}? This cannot be undone.`}
            confirmLabel="Yes, delete files"
            onConfirm={deleteAll}
          >
            <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
            Delete all files
          </ConfirmButton>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        {job.files_deleted_at && <p className="text-sm text-neutral-400">Files were deleted on {formatDateTime(job.files_deleted_at)}.</p>}
        <div>
          <p className="mb-1 text-sm font-medium text-neutral-200">Original files</p>
          <FileDownloadList files={originals} emptyText="None." showDate />
        </div>
        {photos.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-200">Hardware photos</p>
            <FileDownloadList files={photos} emptyText="" showDate />
          </div>
        )}
        {additional.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-200">Additional files from the customer</p>
            <FileDownloadList files={additional} emptyText="" showDate />
          </div>
        )}
        <div className="border-t border-white/[0.08] pt-5">
          <p className="mb-1 text-sm font-medium text-neutral-200">Completed files</p>
          <FileDownloadList files={completed} emptyText="No completed file uploaded yet." showDate />
        </div>
        <NoticeLine notice={notice} />
      </div>
    </Panel>
  );
}

/* ------------------------------------------------------------------- notes */

export function NotesPanel({ jobId, notes, onChanged }: { jobId: string; notes: { id: string; body: string; created_at: string }[]; onChanged: () => void }) {
  const [draft, setDraft] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!draft.trim()) return;
    setBusy(true);
    setError(null);
    const { error: insertError } = await supabase.from('job_notes').insert({ job_id: jobId, body: draft.trim() });
    setBusy(false);
    if (insertError) {
      setError('The note could not be saved.');
      return;
    }
    setDraft('');
    onChanged();
  };

  return (
    <Panel title="Internal notes">
      <p className="mb-4 text-xs text-neutral-500">Only visible to admins. Never shown to the customer.</p>
      {notes.length > 0 && (
        <ul className="mb-5 flex flex-col gap-3">
          {notes.map((note) => (
            <li key={note.id} className="rounded-lg border border-white/[0.08] bg-surface-sunken px-4 py-3">
              <p className="whitespace-pre-wrap break-words text-sm text-neutral-200">{note.body}</p>
              <p className="mt-1 text-xs text-neutral-500">{formatDateTime(note.created_at)}</p>
            </li>
          ))}
        </ul>
      )}
      <form onSubmit={add} className="flex flex-col gap-3">
        <TextArea id="admin-note" label="Add a note" hideLabel placeholder="Add an internal note" value={draft} maxLength={5000} onChange={(event) => setDraft(event.target.value)} className="min-h-20" />
        {error && <p role="alert" className="text-sm text-red-400">{error}</p>}
        <Button type="submit" variant="secondary" size="sm" disabled={busy || !draft.trim()} className="self-end">
          Save note
        </Button>
      </form>
    </Panel>
  );
}

/* -------------------------------------------------------------- delete job */

/** Permanently deletes the job and everything attached to it. Jobs with a recorded payment are kept. */
export function DeleteJobPanel({ job, hasPayments }: { job: JobRow; hasPayments: boolean }) {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const remove = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await callFunction('admin-users', { action: 'delete_job', jobId: job.id });
      navigate('/admin/jobs', { replace: true, state: { deleted: job.reference } });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
      setBusy(false);
    }
  };

  return (
    <Panel title="Delete job">
      <p className="mb-4 text-sm leading-[1.5] text-neutral-400">
        {hasPayments
          ? 'This job has a recorded payment, so it is kept for your records. You can still delete its files above.'
          : 'Permanently removes this job with its files, messages, notes and activity log. Use it for tests, spam or duplicates.'}
      </p>
      <ConfirmButton
        busy={busy}
        disabled={hasPayments}
        message={`Permanently delete ${job.reference}? Its files, messages, notes and activity log are deleted too. This cannot be undone.`}
        confirmLabel="Yes, delete job"
        onConfirm={remove}
      >
        <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />
        Delete job
      </ConfirmButton>
      <div className="mt-3">
        <NoticeLine notice={notice} />
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- activity */

const EVENT_LABELS: Record<string, (details: Record<string, unknown>) => string> = {
  submitted: (d) => `Job submitted (${d.files ?? '?'} file${d.files === 1 ? '' : 's'})`,
  status_changed: (d) => `Status changed from ${d.from} to ${d.to}`,
  messages_deleted: (d) => `Conversation deleted (${d.count} message${d.count === 1 ? '' : 's'})`,
  quotation_sent: (d) => `Quotation sent: ${formatMoney(Number(d.amount), String(d.currency ?? 'EUR'))}`,
  payment_link_updated: (d) => (d.set ? 'Payment link saved' : 'Payment link removed'),
  marked_paid: (d) =>
    `Marked as paid: ${formatMoney(Number(d.amount), String(d.currency ?? 'EUR'))} · ${PAYMENT_METHOD_LABELS[String(d.method)] ?? d.method}${d.provider ? ` (${d.provider})` : ''}`,
  file_uploaded: (d) => `File uploaded (${d.kind}): ${d.file}`,
  files_deleted: (d) => `${d.count ?? 'All'} files deleted${d.reason === 'retention' ? ' by retention policy' : ''}`,
  customer_data_deleted: () => 'Customer data deleted (GDPR request)',
  guest_submitted: (d) => `Guest request received (${d.files ?? '?'} file${d.files === 1 ? '' : 's'})`,
  converted_from_guest: (d) =>
    `Converted to customer job${d.account === 'invited' ? ', account invited' : d.account === 'linked' ? ', linked to existing account' : ', no account'}`,
  download_link_sent: (d) => `Secure download link emailed (valid ${d.days ?? 7} days)`,
};

export function ActivityPanel({ events }: { events: JobEventRow[] }) {
  return (
    <Panel title="Activity log">
      {events.length === 0 ? (
        <p className="text-sm text-neutral-400">No activity yet.</p>
      ) : (
        <ol className="flex flex-col gap-3 border-l border-white/10 pl-4">
          {events.map((event) => (
            <li key={event.id} className="relative">
              <span className="absolute -left-[21px] top-1.5 h-2 w-2 rounded-full bg-brand-500/70" aria-hidden="true" />
              <p className="break-words text-sm text-neutral-200">{EVENT_LABELS[event.action]?.(event.details) ?? event.action}</p>
              <p className="text-xs text-neutral-500">{formatDateTime(event.created_at)}</p>
            </li>
          ))}
        </ol>
      )}
    </Panel>
  );
}
