import { useState, type FormEvent, type ReactNode } from 'react';
import { Check, Copy, Loader2, Mail, MessageCircle, Send } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button, buttonClasses } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TextInput } from '@/components/ui/FormField';
import { SelectInput } from '@/components/ui/Select';
import { callFunction, errorMessage, notify } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { Panel } from '@/features/admin/adminShared';
import { runRpc, SecureLinkActions, StatusControl } from '@/features/admin/adminJobPanels';
import { FileDownloadList, FileUploader } from '@/features/jobs/JobFileActions';
import { formatDate, formatDateTime, formatMoney } from '@/features/jobs/jobFormat';
import {
  customerName,
  PAYMENT_METHOD_LABELS,
  PAYMENT_METHODS,
  vehicleLabel,
  type JobFileRow,
  type JobRow,
  type PaymentMethod,
} from '@/features/jobs/jobTypes';

interface JobWorkflowPanelProps {
  job: JobRow;
  completed: JobFileRow[];
  onChanged: () => void;
}

type StepState = 'done' | 'current' | 'next';

/**
 * The admin's whole job flow in one place: 1 price, 2 payment, 3 delivery.
 * Only the current step shows its controls; finished steps collapse into one line.
 * The status follows automatically (price → Quotation Sent, paid → In Progress, sent → Delivered).
 */
export function JobWorkflowPanel({ job, completed, onChanged }: JobWorkflowPanelProps) {
  const priced = job.quote_amount !== null;
  const paid = job.payment_status === 'paid';
  const delivered = job.status === 'Delivered';

  const priceState: StepState = priced ? 'done' : 'current';
  const payState: StepState = paid ? 'done' : priced ? 'current' : 'next';
  const deliverState: StepState = delivered ? 'done' : paid ? 'current' : 'next';

  return (
    <Panel title="Job progress">
      <ol className="flex flex-col">
        <Step number={1} title="Price" state={priceState} editable={!paid} summary={priced ? formatMoney(job.quote_amount ?? 0, job.quote_currency) : undefined}>
          <PriceStep job={job} onChanged={onChanged} />
        </Step>
        <Step
          number={2}
          title="Payment"
          state={payState}
          summary={paid ? `Paid${job.paid_at ? ` ${formatDate(job.paid_at)}` : ''}${job.payment_method ? ` · ${PAYMENT_METHOD_LABELS[job.payment_method]}` : ''}` : undefined}
        >
          <PaymentStep job={job} onChanged={onChanged} />
        </Step>
        <Step
          number={3}
          title="Delivery"
          state={deliverState}
          last
          summary={delivered ? `Sent${job.delivered_at ? ` ${formatDateTime(job.delivered_at)}` : ''}` : undefined}
        >
          <DeliveryStep job={job} completed={completed} onChanged={onChanged} />
        </Step>
      </ol>

      {/* After delivery, customers without an account still need the secure link. */}
      {delivered && !job.user_id && <SecureLinkActions job={job} completed={completed} ready />}

      <details className="group mt-6 border-t border-white/[0.08] pt-4">
        <summary className="cursor-pointer list-none text-sm text-neutral-400 transition-colors hover:text-white">
          <span className="underline underline-offset-4">Change status manually</span>
          <span className="ml-2 text-neutral-500">Now: {job.status}</span>
        </summary>
        <div className="mt-4">
          <p className="mb-4 text-xs leading-relaxed text-neutral-500">
            Only for special cases, for example Awaiting Information when you need something from the customer. The steps above set the status by themselves.
          </p>
          <StatusControl key={job.updated_at} job={job} onChanged={onChanged} />
        </div>
      </details>
    </Panel>
  );
}

/* ------------------------------------------------------------------- layout */

function Step({
  number,
  title,
  state,
  summary,
  last = false,
  editable = false,
  children,
}: {
  number: number;
  title: string;
  state: StepState;
  summary?: string;
  last?: boolean;
  /** A finished step that can be reopened (the price, until the job is paid). */
  editable?: boolean;
  children: ReactNode;
}) {
  const [editing, setEditing] = useState(false);
  const open = state === 'current' || editing;
  const badge =
    state === 'done'
      ? 'border-emerald-500 bg-emerald-500 text-white'
      : state === 'current'
        ? 'border-brand-500 bg-brand-500/10 text-brand-400'
        : 'border-white/15 text-neutral-500';

  return (
    <li className="relative flex gap-4 pb-6 last:pb-0">
      {!last && <span className="absolute left-[15px] top-9 h-[calc(100%-2.25rem)] w-px bg-white/10" aria-hidden="true" />}
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-sm font-semibold ${badge}`}>
        {state === 'done' ? <Check className="h-4 w-4" aria-hidden="true" /> : number}
      </span>
      <div className="min-w-0 flex-1 pt-1">
        <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
          <p className={`text-sm font-semibold ${state === 'next' ? 'text-neutral-500' : 'text-white'}`}>
            {title}
            {summary && <span className="ml-2 font-normal text-neutral-300">{summary}</span>}
          </p>
          {state === 'done' && editable && (
            <button type="button" onClick={() => setEditing((v) => !v)} className="text-xs text-neutral-400 underline underline-offset-4 hover:text-white">
              {editing ? 'Close' : 'Change'}
            </button>
          )}
        </div>
        {open && <div className="mt-4">{children}</div>}
      </div>
    </li>
  );
}

/* -------------------------------------------------------------------- price */

function PriceStep({ job, onChanged }: { job: JobRow; onChanged: () => void }) {
  const paid = job.payment_status === 'paid';
  const [amount, setAmount] = useState(job.quote_amount !== null ? String(job.quote_amount) : '');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const value = Number(amount.replace(',', '.'));
    if (!Number.isFinite(value) || value <= 0) return setNotice({ tone: 'error', text: 'Enter the price, for example 150.' });
    setBusy(true);
    setNotice(null);
    try {
      await runRpc('admin_send_quotation', { p_job: job.id, p_amount: value, p_currency: 'EUR', p_notes: job.quote_notes ?? '' });
      notify(job.id, 'quotation_sent');
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  if (paid) return <p className="text-xs text-neutral-500">The job is paid, so the price is locked.</p>;

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <div className="sm:w-48">
          <TextInput id="job-price" label="Price (EUR)" inputMode="decimal" placeholder="e.g. 150" value={amount} onChange={(event) => setAmount(event.target.value)} />
        </div>
        <Button type="submit" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
          Save price
        </Button>
      </div>
      <NoticeLine notice={notice} />
    </form>
  );
}

/* ------------------------------------------------------------------ payment */

function paymentRequestText(job: JobRow) {
  const name = job.customer_first_name ? ` ${job.customer_first_name}` : '';
  const vehicle = job.vehicle_make ? ` (${vehicleLabel(job)})` : '';
  const price = formatMoney(job.quote_amount ?? 0, job.quote_currency);
  return {
    subject: `ZEROONEMOD ${job.reference}: payment request ${price}`,
    body: `Hello${name},\n\nThe price for your file ${job.reference}${vehicle} is ${price}.\n\nPayment details:\n\n\nAs soon as the payment is received, we complete your file and send it to you.\n\nKind regards,\nZEROONEMOD`,
  };
}

function PaymentStep({ job, onChanged }: { job: JobRow; onChanged: () => void }) {
  const [method, setMethod] = useState<PaymentMethod>(job.payment_method ?? 'bank_transfer');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const email = job.customer_email;
  const phone = job.customer_phone;
  const { subject, body } = paymentRequestText(job);
  const price = formatMoney(job.quote_amount ?? 0, job.quote_currency);

  const copy = async () => {
    setNotice((await copyText(`${subject}\n\n${body}`)) ? { tone: 'success', text: 'Payment request copied.' } : { tone: 'error', text: 'Could not copy. Please try again.' });
  };

  const markPaid = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await runRpc('admin_mark_paid', {
        p_job: job.id,
        p_amount: job.quote_amount,
        p_currency: job.quote_currency ?? 'EUR',
        p_method: method,
        p_reference: '',
        p_paid_at: new Date().toISOString(),
      });
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3">
        <p className="text-xs leading-relaxed text-neutral-400">Send the payment request to the customer. The email opens ready to send; add your payment details.</p>
        <div className="flex flex-wrap gap-2">
          {email && (
            <a href={`mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`} className={buttonClasses('secondary', 'sm')}>
              <Mail className="h-3.5 w-3.5" aria-hidden="true" />
              Email customer
            </a>
          )}
          {phone && (
            <a
              href={`https://wa.me/${phone.replace(/\D/g, '').replace(/^00/, '')}?text=${encodeURIComponent(body)}`}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonClasses('secondary', 'sm')}
            >
              <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
              WhatsApp
            </a>
          )}
          <Button variant="secondary" size="sm" onClick={copy}>
            <Copy className="h-3.5 w-3.5" aria-hidden="true" />
            Copy text
          </Button>
        </div>
      </div>

      <div className="flex flex-col gap-3 border-t border-white/[0.06] pt-5 sm:flex-row sm:items-end">
        <div className="sm:w-48">
          <SelectInput id="paid-method" label="Paid by" value={method} onChange={(event) => setMethod(event.target.value as PaymentMethod)} options={PAYMENT_METHODS} />
        </div>
        <ConfirmButton
          variant="primary"
          size="md"
          busy={busy}
          message={`Mark ${job.reference} as paid: ${price}, ${PAYMENT_METHOD_LABELS[method]}?`}
          confirmLabel="Yes, mark as paid"
          onConfirm={markPaid}
        >
          <Check className="h-4 w-4" aria-hidden="true" />
          Mark as paid · {price}
        </ConfirmButton>
      </div>
      <NoticeLine notice={notice} />
    </div>
  );
}

/* ----------------------------------------------------------------- delivery */

function DeliveryStep({ job, completed, onChanged }: JobWorkflowPanelProps) {
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const hasFile = completed.length > 0;
  const hasAccount = Boolean(job.user_id);

  const send = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await runRpc('admin_set_job_status', { p_job: job.id, p_status: 'Delivered' });
      // Account holders download from their dashboard; others get the secure link by email.
      if (hasAccount) notify(job.id, 'delivered');
      else void callFunction('notify', { jobId: job.id, event: 'download_link' }).catch(() => undefined);
      onChanged();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {hasFile && <FileDownloadList files={completed} emptyText="" showDate />}
      <FileUploader
        jobId={job.id}
        reference={job.reference}
        kind="completed"
        title={hasFile ? 'Add another file' : 'Upload the completed file'}
        description="The customer receives it when you press Send."
        onUploaded={onChanged}
      />
      <NoticeLine notice={notice} />
      <ConfirmButton
        variant="primary"
        size="md"
        busy={busy}
        disabled={!hasFile}
        className="w-full sm:w-auto sm:self-start"
        message={
          hasAccount
            ? `Send the completed file of ${job.reference} to ${customerName(job)}? They can download it from their account and receive an email.`
            : `Send the completed file of ${job.reference}? We email ${job.customer_email ?? 'the customer'} a secure download link (valid 7 days).`
        }
        confirmLabel="Yes, send"
        onConfirm={send}
      >
        <Send className="h-4 w-4" aria-hidden="true" />
        Send file to customer
      </ConfirmButton>
      {!hasFile && <p className="text-xs text-neutral-500">Upload the completed file first.</p>}
    </div>
  );
}
