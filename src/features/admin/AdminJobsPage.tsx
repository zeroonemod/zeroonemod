import { useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { LoadingState } from '@/components/ui/LoadingState';
import { SearchInput } from '@/components/ui/SearchInput';
import { SelectInput } from '@/components/ui/Select';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { downloadCsv } from '@/lib/csv';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, EmptyRow } from '@/features/admin/adminShared';
import { useAdminJobs } from '@/features/admin/useAdminJobs';
import { formatDate, formatMoney } from '@/features/jobs/jobFormat';
import {
  customerName,
  JOB_STATUSES,
  PAYMENT_COLUMNS,
  PAYMENT_METHOD_LABELS,
  SERVICE_LABELS,
  vehicleLabel,
  type JobRow,
  type PaymentRow,
} from '@/features/jobs/jobTypes';

type SortKey = 'newest' | 'oldest' | 'reference' | 'status' | 'customer';

const SORTS: { value: SortKey; label: string }[] = [
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'reference', label: 'Reference' },
  { value: 'status', label: 'Status' },
  { value: 'customer', label: 'Customer' },
];

function sortJobs(jobs: JobRow[], key: SortKey): JobRow[] {
  const list = [...jobs];
  switch (key) {
    case 'oldest':
      return list.sort((a, b) => a.created_at.localeCompare(b.created_at));
    case 'reference':
      return list.sort((a, b) => a.reference.localeCompare(b.reference));
    case 'status':
      return list.sort((a, b) => JOB_STATUSES.indexOf(a.status) - JOB_STATUSES.indexOf(b.status));
    case 'customer':
      return list.sort((a, b) => customerName(a).localeCompare(customerName(b)));
    default:
      return list.sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
}

export function exportJobsCsv(jobs: JobRow[]) {
  downloadCsv(
    `zeroonemod-jobs-${new Date().toISOString().slice(0, 10)}.csv`,
    jobs.map((job) => ({
      reference: job.reference,
      created_at: job.created_at,
      status: job.status,
      customer: customerName(job),
      email: job.customer_email,
      company: job.company_name ?? '',
      country: job.customer_country,
      customer_type: job.customer_type,
      control_unit: job.file_type,
      service: SERVICE_LABELS[job.requested_service] ?? job.requested_service,
      vehicle: vehicleLabel(job),
      engine: job.vehicle_engine,
      vin: job.vehicle_vin,
      quote_amount: job.quote_amount ?? '',
      currency: job.quote_currency,
      payment_status: job.payment_status,
      payment_method: job.payment_method ? PAYMENT_METHOD_LABELS[job.payment_method] : '',
      paid_at: job.paid_at ?? '',
      delivered_at: job.delivered_at ?? '',
    })),
  );
}

export async function exportPaymentsCsv() {
  const { data, error } = await supabase
    .from('payments')
    .select(`${PAYMENT_COLUMNS}, jobs!inner(reference, customer_first_name, customer_last_name, customer_email)`)
    .order('paid_at', { ascending: false });
  if (error || !Array.isArray(data)) throw new Error('Payments could not be exported.');
  downloadCsv(
    `zeroonemod-payments-${new Date().toISOString().slice(0, 10)}.csv`,
    (data as unknown as (PaymentRow & { jobs: { reference: string; customer_first_name: string; customer_last_name: string; customer_email: string } })[]).map(
      (payment) => ({
        job_reference: payment.jobs.reference,
        customer: `${payment.jobs.customer_first_name} ${payment.jobs.customer_last_name}`,
        email: payment.jobs.customer_email,
        amount: payment.amount,
        currency: payment.currency,
        method: PAYMENT_METHOD_LABELS[payment.method] ?? payment.method,
        status: payment.status,
        reference: payment.reference_note ?? '',
        paid_at: payment.paid_at,
      }),
    ),
  );
}

export function AdminJobsPage() {
  const { jobs, error } = useAdminJobs();
  const navigate = useNavigate();
  const [query, setQuery] = useState('');
  const [status, setStatus] = useState('all');
  const [payment, setPayment] = useState('all');
  const [unit, setUnit] = useState('all');
  const [sort, setSort] = useState<SortKey>('newest');
  const [exportError, setExportError] = useState<string | null>(null);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    const filtered = (jobs ?? []).filter((job) => {
      if (status !== 'all' && job.status !== status) return false;
      if (payment !== 'all' && job.payment_status !== payment) return false;
      if (unit !== 'all' && job.file_type !== unit) return false;
      if (!needle) return true;
      return [job.reference, customerName(job), job.customer_email, job.company_name ?? '', job.vehicle_make, job.vehicle_model, job.vehicle_vin].some(
        (value) => value.toLowerCase().includes(needle),
      );
    });
    return sortJobs(filtered, sort);
  }, [jobs, query, status, payment, unit, sort]);

  if (error) return <p role="alert" className="text-sm text-red-400">We could not load the jobs. Please refresh the page.</p>;
  if (!jobs) return <LoadingState label="Loading jobs" />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader
        title="Jobs"
        description={`${jobs.length} job${jobs.length === 1 ? '' : 's'} in total.`}
        actions={
          <>
            <Button variant="secondary" size="sm" onClick={() => exportJobsCsv(visible)} disabled={visible.length === 0}>
              <Download className="h-4 w-4" aria-hidden="true" />
              Export jobs CSV
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => exportPaymentsCsv().catch((e: Error) => setExportError(e.message))}
            >
              <Download className="h-4 w-4" aria-hidden="true" />
              Export payments CSV
            </Button>
          </>
        }
      />
      {exportError && <p role="alert" className="text-sm text-red-400">{exportError}</p>}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-[2fr_1fr_1fr_1fr_1fr]">
        <div className="sm:col-span-2 xl:col-span-1">
          <SearchInput id="admin-job-search" label="Search" placeholder="Reference, customer, email, vehicle or VIN" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <SelectInput id="admin-job-status" label="Status" value={status} onChange={(e) => setStatus(e.target.value)} options={[{ value: 'all', label: 'All statuses' }, ...JOB_STATUSES.map((s) => ({ value: s, label: s }))]} />
        <SelectInput id="admin-job-payment" label="Payment" value={payment} onChange={(e) => setPayment(e.target.value)} options={[{ value: 'all', label: 'All' }, { value: 'paid', label: 'Paid' }, { value: 'not_paid', label: 'Not paid' }]} />
        <SelectInput id="admin-job-unit" label="Control unit" value={unit} onChange={(e) => setUnit(e.target.value)} options={[{ value: 'all', label: 'ECU and TCU' }, { value: 'ECU', label: 'ECU' }, { value: 'TCU', label: 'TCU' }]} />
        <SelectInput id="admin-job-sort" label="Sort" value={sort} onChange={(e) => setSort(e.target.value as SortKey)} options={SORTS} />
      </div>

      {visible.length === 0 ? (
        <EmptyRow>{jobs.length === 0 ? 'No jobs yet.' : 'No jobs match these filters.'}</EmptyRow>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden overflow-x-auto rounded-xl border border-white/[0.08] lg:block">
            <table className="w-full min-w-[900px] text-left text-sm">
              <thead className="bg-surface-raised text-xs uppercase tracking-wider text-neutral-500">
                <tr>
                  <th scope="col" className="px-4 py-3 font-medium">Reference</th>
                  <th scope="col" className="px-4 py-3 font-medium">Date</th>
                  <th scope="col" className="px-4 py-3 font-medium">Customer</th>
                  <th scope="col" className="px-4 py-3 font-medium">Vehicle</th>
                  <th scope="col" className="px-4 py-3 font-medium">Service</th>
                  <th scope="col" className="px-4 py-3 font-medium">Quote</th>
                  <th scope="col" className="px-4 py-3 font-medium">Payment</th>
                  <th scope="col" className="px-4 py-3 font-medium">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/[0.06] bg-surface">
                {visible.map((job) => (
                  <tr key={job.id} onClick={() => navigate(`/admin/jobs/${job.reference}`)} className="cursor-pointer transition-colors hover:bg-white/[0.03]">
                    <td className="px-4 py-3 font-semibold text-white">
                      <Link to={`/admin/jobs/${job.reference}`} onClick={(e) => e.stopPropagation()} className="hover:text-brand-400">
                        {job.reference}
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-400">{formatDate(job.created_at)}</td>
                    <td className="px-4 py-3">
                      <span className="block text-neutral-100">{customerName(job)}</span>
                      <span className="block text-xs text-neutral-500">{job.company_name ?? job.customer_email}</span>
                    </td>
                    <td className="px-4 py-3 text-neutral-300">{vehicleLabel(job)}</td>
                    <td className="px-4 py-3 text-neutral-300">
                      {job.file_type} · {SERVICE_LABELS[job.requested_service] ?? job.requested_service}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 text-neutral-300">{job.quote_amount !== null ? formatMoney(job.quote_amount, job.quote_currency) : '-'}</td>
                    <td className="px-4 py-3">
                      <span className={job.payment_status === 'paid' ? 'text-white' : 'text-neutral-500'}>{job.payment_status === 'paid' ? 'Paid' : 'Not paid'}</span>
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={job.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile and tablet cards */}
          <ul className="flex flex-col gap-3 lg:hidden">
            {visible.map((job) => (
              <li key={job.id}>
                <Link
                  to={`/admin/jobs/${job.reference}`}
                  className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-surface p-4 transition-colors hover:border-brand-500/50"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="text-sm font-semibold text-white">{job.reference}</span>
                    <StatusBadge status={job.status} />
                  </div>
                  <p className="break-words text-sm text-neutral-200">
                    {customerName(job)} <span className="text-neutral-500">· {job.company_name ?? job.customer_email}</span>
                  </p>
                  <p className="text-xs text-neutral-400">
                    {vehicleLabel(job)} · {job.file_type} · {SERVICE_LABELS[job.requested_service] ?? job.requested_service}
                  </p>
                  <p className="text-xs text-neutral-500">
                    {formatDate(job.created_at)} · {job.quote_amount !== null ? formatMoney(job.quote_amount, job.quote_currency) : 'No quote'} ·{' '}
                    {job.payment_status === 'paid' ? 'Paid' : 'Not paid'}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        </>
      )}
    </div>
  );
}
