import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Copy, Loader2, Mail, MessageCircle, Phone } from 'lucide-react';
import { Alert, NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button, buttonClasses } from '@/components/ui/Button';
import { CheckboxField, TextInput } from '@/components/ui/FormField';
import { SelectInput } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { callFunction, errorMessage, notify } from '@/lib/api';
import { copyText } from '@/lib/clipboard';
import { isValidEmail } from '@/lib/requestForms';
import { supabase } from '@/lib/supabase';
import { GuestBadge, Panel } from '@/features/admin/adminShared';
import { ActivityPanel, DeleteJobPanel, DeliveryPanel, FilesPanel, NotesPanel, PaymentPanel, QuotationPanel, StatusPanel } from '@/features/admin/adminJobPanels';
import { formatDateTime } from '@/features/jobs/jobFormat';
import { JobVehicleDetails } from '@/features/jobs/JobInfo';
import type { JobEventRow, JobFileRow, JobRow, PaymentRow } from '@/features/jobs/jobTypes';
import { CUSTOMER_TYPE_OPTIONS, FUEL_OPTIONS, SERVICE_OPTIONS } from '@/features/submission/types';

interface GuestRequestDetailProps {
  job: JobRow;
  files: JobFileRow[];
  notes: { id: string; body: string; created_at: string }[];
  events: JobEventRow[];
  payments: PaymentRow[];
  onChanged: () => void;
}

/** Admin page for a guest request: contact, vehicle, files, quotation, payment link, delivery, notes, log and conversion. */
export function GuestRequestDetail({ job, files, notes, events, payments, onChanged }: GuestRequestDetailProps) {
  return (
    <div className="flex flex-col gap-8">
      <Link to="/admin/jobs" className="inline-flex w-fit items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        All jobs
      </Link>

      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="flex min-w-0 flex-col gap-2">
          <GuestBadge />
          <h1 className="text-3xl font-semibold leading-[1.2] sm:text-4xl">{job.reference}</h1>
          <p className="text-sm text-neutral-400">Received {formatDateTime(job.created_at)}</p>
        </div>
        <StatusBadge status={job.status} />
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
        <div className="flex min-w-0 flex-col gap-6">
          <GuestContactPanel job={job} />
          {job.vehicle_make && (
            <Panel title="Vehicle and ECU">
              <JobVehicleDetails job={job} />
            </Panel>
          )}
          <FilesPanel job={job} files={files} onChanged={onChanged} />
          <ConvertGuestPanel key={job.updated_at} job={job} onChanged={onChanged} />
        </div>
        <div className="flex min-w-0 flex-col gap-6">
          <StatusPanel key={`status-${job.updated_at}`} job={job} onChanged={onChanged} />
          <QuotationPanel key={`quote-${job.updated_at}`} job={job} onChanged={onChanged} />
          <PaymentPanel key={`pay-${job.updated_at}`} job={job} payments={payments} onChanged={onChanged} />
          <DeliveryPanel job={job} completed={files.filter((f) => f.kind === 'completed')} onChanged={onChanged} />
          <NotesPanel jobId={job.id} notes={notes} onChanged={onChanged} />
          <ActivityPanel events={events} />
          <DeleteJobPanel job={job} hasPayments={payments.length > 0} />
        </div>
      </div>
    </div>
  );
}

/**
 * Copies a value to the clipboard. Email and Call open the computer's mail and phone apps,
 * which not every computer has set up, so copying always works as a fallback.
 */
function CopyButton({ value, label }: { value: string; label: string }) {
  const [state, setState] = useState<'idle' | 'copied' | 'failed'>('idle');

  const copy = async () => {
    setState((await copyText(value)) ? 'copied' : 'failed');
    window.setTimeout(() => setState('idle'), 2000);
  };

  return (
    <Button variant="secondary" size="sm" onClick={copy} aria-label={`Copy ${label}`}>
      {state === 'copied' ? <Check className="h-3.5 w-3.5" aria-hidden="true" /> : <Copy className="h-3.5 w-3.5" aria-hidden="true" />}
      {state === 'copied' ? 'Copied' : state === 'failed' ? 'Copy failed' : 'Copy'}
    </Button>
  );
}

/** wa.me needs the number in international format, digits only. */
function whatsappUrl(phone: string): string {
  return `https://wa.me/${phone.replace(/\D/g, '').replace(/^00/, '')}`;
}

function GuestContactPanel({ job }: { job: JobRow }) {
  const email = job.customer_email as string | null;
  const phone = job.customer_phone;

  return (
    <Panel title="Contact">
      <dl className="flex flex-col gap-5 text-sm">
        {email && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wider text-neutral-500">Email</dt>
              <dd className="break-all text-neutral-100">{email}</dd>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <CopyButton value={email} label="email" />
              <a href={`mailto:${email}?subject=${encodeURIComponent(`Your file ${job.reference}`)}`} className={buttonClasses('secondary', 'sm')}>
                <Mail className="h-3.5 w-3.5" aria-hidden="true" />
                Email
              </a>
            </div>
          </div>
        )}
        {phone && (
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="min-w-0">
              <dt className="text-xs uppercase tracking-wider text-neutral-500">Phone</dt>
              <dd className="break-all text-neutral-100">{phone}</dd>
            </div>
            <div className="flex shrink-0 flex-wrap gap-2">
              <CopyButton value={phone} label="phone number" />
              <a href={`tel:${phone.replace(/[^\d+]/g, '')}`} className={buttonClasses('secondary', 'sm')}>
                <Phone className="h-3.5 w-3.5" aria-hidden="true" />
                Call
              </a>
              <a href={whatsappUrl(phone)} target="_blank" rel="noopener noreferrer" className={buttonClasses('secondary', 'sm')}>
                <MessageCircle className="h-3.5 w-3.5" aria-hidden="true" />
                WhatsApp
              </a>
            </div>
          </div>
        )}
        <div className="border-t border-white/[0.08] pt-5">
          <dt className="mb-2 text-xs uppercase tracking-wider text-neutral-500">Notes from the guest</dt>
          <dd className="whitespace-pre-wrap break-words leading-[1.5] text-neutral-200">{job.service_comments || '-'}</dd>
        </div>
      </dl>
    </Panel>
  );
}

const VIN_PATTERN = /^[A-HJ-NPR-Z0-9]{17}$/;

interface ConvertForm {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  country: string;
  customerType: string;
  companyName: string;
  fileType: string;
  requestedService: string;
  make: string;
  model: string;
  year: string;
  engine: string;
  fuelType: string;
  vin: string;
  manufacturer: string;
  hardwareNumber: string;
  softwareNumber: string;
  price: string;
  createAccount: boolean;
}

function missingFields(form: ConvertForm): string | null {
  const required: [keyof ConvertForm, string][] = [
    ['firstName', 'first name'], ['lastName', 'last name'], ['email', 'email'], ['country', 'country'], ['customerType', 'customer type'],
    ['fileType', 'ECU or TCU'], ['requestedService', 'service'], ['make', 'make'], ['model', 'model'], ['year', 'year'],
    ['engine', 'engine'], ['fuelType', 'fuel type'], ['vin', 'VIN'],
  ];
  const missing = required.filter(([key]) => !String(form[key]).trim()).map(([, label]) => label);
  if (form.customerType === 'workshop' && !form.companyName.trim()) missing.push('company name');
  if (missing.length) return `Please fill in: ${missing.join(', ')}.`;
  if (!isValidEmail(form.email)) return 'Enter a valid email address. It is needed for the customer job.';
  if (!VIN_PATTERN.test(form.vin.trim().toUpperCase())) return 'A VIN has 17 letters or numbers (no I, O or Q).';
  const year = Number(form.year);
  if (!Number.isInteger(year) || year < 1950 || year > new Date().getFullYear() + 1) return 'Enter a valid model year.';
  if (form.price.trim() && !(Number(form.price.replace(',', '.')) > 0)) return 'Enter a valid price, or leave it empty.';
  return null;
}

/**
 * CONVERT TO CUSTOMER JOB: the admin adds the missing customer, vehicle and service details so the
 * normal flow (quotation, payment link, mark as paid, completed file, deliver) can continue.
 */
function ConvertGuestPanel({ job, onChanged }: { job: JobRow; onChanged: () => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<ConvertForm>({
    // Guests now send the vehicle and ECU/TCU details, so only the customer details are usually missing.
    firstName: '', lastName: '', email: (job.customer_email as string | null) ?? '', phone: job.customer_phone ?? '', country: '',
    customerType: 'individual', companyName: '',
    fileType: job.file_type ?? '', requestedService: job.requested_service ?? '',
    make: job.vehicle_make ?? '', model: job.vehicle_model ?? '', year: job.vehicle_year ? String(job.vehicle_year) : '',
    engine: job.vehicle_engine ?? '', fuelType: job.vehicle_fuel_type ?? '', vin: job.vehicle_vin ?? '',
    manufacturer: job.ecu_manufacturer ?? '', hardwareNumber: job.ecu_hardware_number ?? '', softwareNumber: job.ecu_software_number ?? '',
    price: '', createAccount: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const set = <K extends keyof ConvertForm>(key: K, value: ConvertForm[K]) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const problem = missingFields(form);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const result = await callFunction<{ account: 'none' | 'linked' | 'invited' }>('admin-users', {
        action: 'convert_guest',
        jobId: job.id,
        createAccount: form.createAccount,
        details: { ...form, vin: form.vin.trim().toUpperCase(), year: Number(form.year) },
      });
      const price = Number(form.price.replace(',', '.'));
      if (form.price.trim() && price > 0) {
        const { error: quoteError } = await supabase.rpc('admin_send_quotation', { p_job: job.id, p_amount: price, p_currency: 'EUR', p_notes: '' });
        if (quoteError) throw new Error(`Converted, but the quotation could not be sent: ${quoteError.message}`);
        notify(job.id, 'quotation_sent');
      }
      setNotice({
        tone: 'success',
        text:
          result.account === 'invited'
            ? 'Converted. The customer was invited to create an account.'
            : result.account === 'linked'
              ? 'Converted and linked to the existing account for this email.'
              : 'Converted. No account was created.',
      });
      setOpen(false);
      onChanged();
    } catch (convertError) {
      setError(errorMessage(convertError));
    } finally {
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <Panel title="Convert to customer job">
        <p className="mb-5 text-sm leading-[1.5] text-neutral-400">
          After contacting the guest, add their details and the vehicle to continue with the normal flow: quotation, payment link, mark as paid, completed file and delivery.
        </p>
        <Button onClick={() => setOpen(true)}>Convert to customer job</Button>
        <div className="mt-3">
          <NoticeLine notice={notice} />
        </div>
      </Panel>
    );
  }

  const field = (key: keyof ConvertForm, label: string, extra: Record<string, unknown> = {}) => (
    <TextInput id={`convert-${key}`} label={label} value={String(form[key])} onChange={(e) => set(key, e.target.value as never)} {...extra} />
  );

  return (
    <Panel title="Convert to customer job">
      <form onSubmit={submit} noValidate className="flex flex-col gap-6">
        <fieldset className="grid gap-4 sm:grid-cols-2">
          <legend className="mb-3 text-sm font-medium text-neutral-200">Customer</legend>
          {field('firstName', 'First name')}
          {field('lastName', 'Last name')}
          {field('email', 'Email', { type: 'email' })}
          {field('phone', 'Phone', { type: 'tel', optional: true })}
          {field('country', 'Country')}
          <SelectInput id="convert-customerType" label="Customer type" value={form.customerType} onChange={(e) => set('customerType', e.target.value)} options={CUSTOMER_TYPE_OPTIONS} />
          {form.customerType === 'workshop' && field('companyName', 'Company name')}
        </fieldset>

        <fieldset className="grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-2">
          <legend className="mb-3 pt-6 text-sm font-medium text-neutral-200">Vehicle and ECU/TCU</legend>
          <SelectInput id="convert-fileType" label="Control unit" placeholder="Select" value={form.fileType} onChange={(e) => set('fileType', e.target.value)} options={[{ value: 'ECU', label: 'ECU' }, { value: 'TCU', label: 'TCU' }]} />
          <SelectInput id="convert-service" label="Service" placeholder="Select" value={form.requestedService} onChange={(e) => set('requestedService', e.target.value)} options={SERVICE_OPTIONS} />
          {field('make', 'Make')}
          {field('model', 'Model')}
          {field('year', 'Year', { inputMode: 'numeric' })}
          {field('engine', 'Engine')}
          <SelectInput id="convert-fuel" label="Fuel type" placeholder="Select" value={form.fuelType} onChange={(e) => set('fuelType', e.target.value)} options={FUEL_OPTIONS.map((fuel) => ({ value: fuel, label: fuel }))} />
          {field('vin', 'VIN', { maxLength: 17, className: 'font-mono uppercase' })}
          {field('manufacturer', 'ECU/TCU manufacturer', { optional: true })}
          {field('hardwareNumber', 'Hardware number', { optional: true })}
          {field('softwareNumber', 'Software number', { optional: true })}
        </fieldset>

        <div className="grid gap-4 border-t border-white/[0.08] pt-6 sm:grid-cols-2">
          {field('price', 'Price (EUR)', { optional: true, inputMode: 'decimal', hint: 'If filled, the quotation is sent right away.' })}
        </div>

        <CheckboxField id="convert-account" checked={form.createAccount} onChange={(checked) => set('createAccount', checked)}>
          Create an account for this customer (or link the existing account for this email), so they can follow the job, pay and download from their dashboard.
        </CheckboxField>

        {error && <Alert>{error}</Alert>}

        <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" disabled={busy}>
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Convert to customer job
          </Button>
        </div>
      </form>
    </Panel>
  );
}
