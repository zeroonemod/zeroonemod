import { useState, type FormEvent } from 'react';
import { CheckCircle2, Circle, Loader2, Send, Trash2, Truck } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { SelectInput } from '@/components/ui/Select';
import { errorMessage, notify } from '@/lib/api';
import { JOB_FILES_BUCKET } from '@/lib/storagePaths';
import { supabase } from '@/lib/supabase';
import { confirmAction, Panel } from '@/features/admin/adminShared';
import { FileDownloadList, FileUploader } from '@/features/jobs/JobFileActions';
import { formatDate, formatDateTime, formatMoney } from '@/features/jobs/jobFormat';
import {
  JOB_STATUSES,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  type JobEventRow,
  type JobFileRow,
  type JobRow,
  type JobStatus,
  type PaymentMethod,
  type PaymentRow,
} from '@/features/jobs/jobTypes';

interface PanelProps {
  job: JobRow;
  onChanged: () => void;
}

async function runRpc(name: string, params: Record<string, unknown>) {
  const { error } = await supabase.rpc(name, params);
  if (error) throw new Error(error.message);
}

/* ------------------------------------------------------------------ status */

export function StatusPanel({ job, onChanged }: PanelProps) {
  const [status, setStatus] = useState<JobStatus>(job.status);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const save = async () => {
    if (status === job.status) return;
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
    <Panel title="Status">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="flex-1">
          <SelectInput
            id="admin-status"
            label="Job status"
            value={status}
            onChange={(event) => setStatus(event.target.value as JobStatus)}
            options={JOB_STATUSES.map((value) => ({ value, label: value }))}
          />
        </div>
        <Button onClick={save} disabled={busy || status === job.status}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Update status
        </Button>
      </div>
      <div className="mt-3">
        <NoticeLine notice={notice} />
      </div>
    </Panel>
  );
}

/* --------------------------------------------------------------- quotation */

export function QuotationPanel({ job, onChanged }: PanelProps) {
  const [amount, setAmount] = useState(job.quote_amount !== null ? String(job.quote_amount) : '');
  const [notes, setNotes] = useState(job.quote_notes ?? '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const paid = job.payment_status === 'paid';

  const send = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setNotice({ tone: 'error', text: 'Enter a valid price.' });
      return;
    }
    setBusy(true);
    setNotice(null);
    try {
      await runRpc('admin_send_quotation', { p_job: job.id, p_amount: value, p_currency: 'EUR', p_notes: notes });
      notify(job.id, 'quotation_sent');
      setNotice({ tone: 'success', text: 'Quotation sent to the customer.' });
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Panel title="Quotation">
      {job.quoted_at && (
        <p className="mb-4 text-sm text-neutral-400">
          Last sent {formatDateTime(job.quoted_at)}: <span className="text-white">{formatMoney(job.quote_amount ?? 0, job.quote_currency)}</span>
        </p>
      )}
      <form onSubmit={send} className="flex flex-col gap-4" noValidate>
        <TextInput
          id="quote-amount"
          label="Price (EUR)"
          inputMode="decimal"
          placeholder="e.g. 150.00"
          value={amount}
          onChange={(event) => setAmount(event.target.value)}
          disabled={paid}
        />
        <TextArea
          id="quote-notes"
          label="Quotation notes"
          optional
          hint="Shown to the customer with the price, for example what is included and the expected timing."
          value={notes}
          maxLength={3000}
          onChange={(event) => setNotes(event.target.value)}
          disabled={paid}
        />
        <NoticeLine notice={notice} />
        <Button type="submit" disabled={busy || paid} className="w-full sm:w-auto sm:self-end">
          {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          {job.quoted_at ? 'Send updated quotation' : 'Send quotation'}
        </Button>
        {paid && <p className="text-xs text-neutral-500">This job is paid, so the quotation is locked.</p>}
      </form>
    </Panel>
  );
}

/* ----------------------------------------------------------------- payment */

export function PaymentPanel({ job, payments, onChanged }: PanelProps & { payments: PaymentRow[] }) {
  const paid = job.payment_status === 'paid';
  const [link, setLink] = useState(job.payment_link ?? '');
  const [linkBusy, setLinkBusy] = useState(false);
  const [linkNotice, setLinkNotice] = useState<Notice>(null);

  const [amount, setAmount] = useState(job.quote_amount !== null ? String(job.quote_amount) : '');
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [method, setMethod] = useState<PaymentMethod>('card_link');
  const [reference, setReference] = useState('');
  const [payBusy, setPayBusy] = useState(false);
  const [payNotice, setPayNotice] = useState<Notice>(null);

  const saveLink = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLinkBusy(true);
    setLinkNotice(null);
    try {
      await runRpc('admin_set_payment_link', { p_job: job.id, p_link: link });
      if (link.trim() && job.quote_amount !== null) notify(job.id, 'payment_link');
      setLinkNotice({ tone: 'success', text: link.trim() ? 'Payment link saved. The customer can now pay from their account.' : 'Payment link removed.' });
      onChanged();
    } catch (error) {
      setLinkNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setLinkBusy(false);
    }
  };

  const markPaid = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) {
      setPayNotice({ tone: 'error', text: 'Enter the amount received.' });
      return;
    }
    if (!confirmAction(`Mark ${job.reference} as paid (${formatMoney(value, 'EUR')}, ${PAYMENT_METHOD_LABELS[method]})?`)) return;
    setPayBusy(true);
    setPayNotice(null);
    try {
      await runRpc('admin_mark_paid', {
        p_job: job.id,
        p_amount: value,
        p_currency: 'EUR',
        p_method: method,
        p_reference: reference,
        p_paid_at: new Date(`${date}T12:00:00`).toISOString(),
      });
      setPayNotice({ tone: 'success', text: 'Marked as paid.' });
      onChanged();
    } catch (error) {
      setPayNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setPayBusy(false);
    }
  };

  return (
    <Panel title="Payment">
      <div className="flex flex-col gap-6">
        <p className="text-sm text-neutral-300">
          {paid ? (
            <>
              <span className="font-semibold text-white">Paid</span>
              {job.paid_at && ` on ${formatDate(job.paid_at)}`}
              {job.payment_method && ` · ${PAYMENT_METHOD_LABELS[job.payment_method]}`}
            </>
          ) : (
            'Not paid yet.'
          )}
        </p>

        {!paid && (
          <form onSubmit={saveLink} className="flex flex-col gap-3 border-t border-white/[0.08] pt-5" noValidate>
            <TextInput
              id="payment-link"
              label="Payment link"
              type="url"
              placeholder="https://"
              hint="Paste any payment link (card link, payment page). The customer sees a PAY NOW button that opens it in a new tab."
              value={link}
              onChange={(event) => setLink(event.target.value)}
            />
            <NoticeLine notice={linkNotice} />
            <Button type="submit" variant="secondary" disabled={linkBusy || link.trim() === (job.payment_link ?? '')} className="w-full sm:w-auto sm:self-end">
              {linkBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save payment link
            </Button>
          </form>
        )}

        {!paid && (
          <form onSubmit={markPaid} className="flex flex-col gap-4 border-t border-white/[0.08] pt-5" noValidate>
            <p className="text-sm font-medium text-neutral-200">Mark as paid</p>
            <div className="grid gap-4 sm:grid-cols-2">
              <TextInput id="paid-amount" label="Amount (EUR)" inputMode="decimal" value={amount} onChange={(event) => setAmount(event.target.value)} />
              <TextInput id="paid-date" label="Date received" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
              <SelectInput id="paid-method" label="Method" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} options={PAYMENT_METHODS} />
              <TextInput id="paid-reference" label="Reference" optional value={reference} maxLength={200} onChange={(event) => setReference(event.target.value)} />
            </div>
            <NoticeLine notice={payNotice} />
            <Button type="submit" disabled={payBusy} className="w-full sm:w-auto sm:self-end">
              {payBusy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Mark as paid
            </Button>
          </form>
        )}

        {payments.length > 0 && (
          <div className="border-t border-white/[0.08] pt-5">
            <p className="mb-3 text-sm font-medium text-neutral-200">Payments recorded</p>
            <ul className="flex flex-col gap-2 text-sm">
              {payments.map((payment) => (
                <li key={payment.id} className="flex flex-wrap justify-between gap-2 text-neutral-300">
                  <span>
                    {formatMoney(payment.amount, payment.currency)} · {PAYMENT_METHOD_LABELS[payment.method] ?? payment.method}
                    {payment.reference_note && <span className="text-neutral-500"> · {payment.reference_note}</span>}
                  </span>
                  <span className="text-neutral-500">{formatDate(payment.paid_at)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </Panel>
  );
}

/* ---------------------------------------------------------------- delivery */

export function DeliveryPanel({ job, completed, onChanged }: PanelProps & { completed: JobFileRow[] }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const paid = job.payment_status === 'paid';
  const hasFile = completed.length > 0;
  const delivered = job.status === 'Delivered';

  const deliver = async () => {
    if (!confirmAction(`Deliver ${job.reference}? The customer will be able to download the completed file and receives an email.`)) return;
    setBusy(true);
    setNotice(null);
    try {
      await runRpc('admin_set_job_status', { p_job: job.id, p_status: 'Delivered' });
      notify(job.id, 'delivered');
      setNotice({ tone: 'success', text: 'Delivered. The customer has been emailed.' });
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const Check = ({ ok, label }: { ok: boolean; label: string }) => (
    <li className={`flex items-center gap-2 text-sm ${ok ? 'text-white' : 'text-neutral-500'}`}>
      {ok ? <CheckCircle2 className="h-4 w-4 text-brand-500" aria-hidden="true" /> : <Circle className="h-4 w-4" aria-hidden="true" />}
      {label}
    </li>
  );

  return (
    <Panel title="Delivery">
      {delivered ? (
        <p className="text-sm text-neutral-300">Delivered{job.delivered_at ? ` on ${formatDateTime(job.delivered_at)}` : ''}. The customer can download the completed file.</p>
      ) : (
        <div className="flex flex-col gap-4">
          <ul className="flex flex-col gap-2">
            <Check ok={paid} label={job.payment_method === 'partner_arrangement' ? 'Paid (partner arrangement)' : 'Marked as paid (or partner arrangement)'} />
            <Check ok={hasFile} label="Completed file uploaded" />
          </ul>
          <NoticeLine notice={notice} />
          <Button onClick={deliver} disabled={busy || !paid || !hasFile} className="w-full sm:w-auto sm:self-end">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Truck className="h-4 w-4" aria-hidden="true" />}
            Deliver
          </Button>
        </div>
      )}
    </Panel>
  );
}

/* ------------------------------------------------------------------- files */

export function FilesPanel({ job, files, onChanged }: PanelProps & { files: JobFileRow[] }) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const originals = files.filter((f) => f.kind === 'original');
  const additional = files.filter((f) => f.kind === 'additional');
  const completed = files.filter((f) => f.kind === 'completed');

  const deleteAll = async () => {
    if (!confirmAction(`Permanently delete all ${files.length} files of ${job.reference}? This cannot be undone.`)) return;
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
        files.length > 0 ? (
          <Button variant="ghost" size="sm" onClick={deleteAll} disabled={busy}>
            {busy ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Trash2 className="h-3.5 w-3.5" aria-hidden="true" />}
            Delete all files
          </Button>
        ) : null
      }
    >
      <div className="flex flex-col gap-6">
        {job.files_deleted_at && <p className="text-sm text-neutral-400">Files were deleted on {formatDateTime(job.files_deleted_at)}.</p>}
        <div>
          <p className="mb-1 text-sm font-medium text-neutral-200">Original files</p>
          <FileDownloadList files={originals} emptyText="None." showDate />
        </div>
        {additional.length > 0 && (
          <div>
            <p className="mb-1 text-sm font-medium text-neutral-200">Additional files from the customer</p>
            <FileDownloadList files={additional} emptyText="" showDate />
          </div>
        )}
        <div className="border-t border-white/[0.08] pt-5">
          <p className="mb-1 text-sm font-medium text-neutral-200">Completed files</p>
          <FileDownloadList files={completed} emptyText="No completed file uploaded yet." showDate />
          <div className="mt-4">
            <FileUploader
              jobId={job.id}
              reference={job.reference}
              kind="completed"
              title="Upload completed file"
              description="Released to the customer only after payment and delivery."
              onUploaded={onChanged}
            />
          </div>
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

/* ---------------------------------------------------------------- activity */

const EVENT_LABELS: Record<string, (details: Record<string, unknown>) => string> = {
  submitted: (d) => `Job submitted (${d.files ?? '?'} file${d.files === 1 ? '' : 's'})`,
  status_changed: (d) => `Status changed from ${d.from} to ${d.to}`,
  quotation_sent: (d) => `Quotation sent: ${formatMoney(Number(d.amount), String(d.currency ?? 'EUR'))}`,
  payment_link_updated: (d) => (d.set ? 'Payment link saved' : 'Payment link removed'),
  marked_paid: (d) =>
    `Marked as paid: ${formatMoney(Number(d.amount), String(d.currency ?? 'EUR'))} · ${PAYMENT_METHOD_LABELS[String(d.method)] ?? d.method}${d.provider ? ` (${d.provider})` : ''}`,
  file_uploaded: (d) => `File uploaded (${d.kind}): ${d.file}`,
  files_deleted: (d) => `${d.count ?? 'All'} files deleted${d.reason === 'retention' ? ' by retention policy' : ''}`,
  customer_data_deleted: () => 'Customer data deleted (GDPR request)',
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
