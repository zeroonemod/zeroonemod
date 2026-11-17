import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TextArea } from '@/components/ui/FormField';
import { LoadingState } from '@/components/ui/LoadingState';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { callFunction, errorMessage } from '@/lib/api';
import { formatFileSize } from '@/lib/uploadLimits';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, EmptyRow, Panel, PROFILE_COLUMNS, type ProfileRow } from '@/features/admin/adminShared';
import { Detail, DetailGrid } from '@/features/jobs/JobInfo';
import { MessageThreadList } from '@/features/jobs/MessageThreadList';
import { useMessageThreads } from '@/features/jobs/useMessageThreads';
import { formatDate, formatMoney } from '@/features/jobs/jobFormat';
import {
  FILE_COLUMNS,
  JOB_COLUMNS,
  PAYMENT_COLUMNS,
  PAYMENT_METHOD_LABELS,
  SERVICE_LABELS,
  vehicleLabel,
  type JobFileRow,
  type JobRow,
  type PaymentRow,
} from '@/features/jobs/jobTypes';

interface PersonBundle {
  profile: ProfileRow;
  jobs: JobRow[];
  files: JobFileRow[];
  payments: PaymentRow[];
  pricingNotes: string;
}

async function loadPerson(id: string): Promise<PersonBundle | 'not_found' | 'error'> {
  const { data: profile, error } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('id', id).maybeSingle();
  if (error) return 'error';
  if (!profile) return 'not_found';
  const { data: jobs, error: jobsError } = await supabase.from('jobs').select(JOB_COLUMNS).eq('user_id', id).order('created_at', { ascending: false });
  if (jobsError) return 'error';
  const jobIds = (jobs ?? []).map((job) => job.id as string);
  const [files, payments, notes] = await Promise.all([
    jobIds.length ? supabase.from('job_files').select(FILE_COLUMNS).in('job_id', jobIds).order('created_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    jobIds.length ? supabase.from('payments').select(PAYMENT_COLUMNS).in('job_id', jobIds).order('paid_at', { ascending: false }) : Promise.resolve({ data: [], error: null }),
    supabase.from('partner_notes').select('pricing_notes').eq('profile_id', id).maybeSingle(),
  ]);
  return {
    profile: profile as ProfileRow,
    jobs: (jobs ?? []) as unknown as JobRow[],
    files: (files.data ?? []) as unknown as JobFileRow[],
    payments: (payments.data ?? []) as unknown as PaymentRow[],
    pricingNotes: (notes.data?.pricing_notes as string | null) ?? '',
  };
}

/** Customer and partner profile with jobs, file history, messages and payments. */
export function AdminPersonDetail({ kind }: { kind: 'customer' | 'partner' }) {
  const { id = '' } = useParams();
  const navigate = useNavigate();
  const [bundle, setBundle] = useState<PersonBundle | null>(null);
  const [state, setState] = useState<'loading' | 'ready' | 'not_found' | 'error'>('loading');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [pricingNotes, setPricingNotes] = useState('');
  const [notesNotice, setNotesNotice] = useState<Notice>(null);
  const { threads } = useMessageThreads('admin');
  const basePath = kind === 'partner' ? '/admin/partners' : '/admin/customers';

  const refresh = useCallback(async () => {
    const result = await loadPerson(id);
    if (typeof result === 'string') {
      setState(result);
      return;
    }
    setBundle(result);
    setPricingNotes(result.pricingNotes);
    setState('ready');
  }, [id]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (state === 'loading') return <LoadingState label="Loading account" />;
  if (state !== 'ready' || !bundle) {
    return <p role="alert" className="text-sm text-red-400">{state === 'not_found' ? 'This account does not exist.' : 'We could not load this account.'}</p>;
  }

  const { profile, jobs, files, payments } = bundle;
  const jobRefs = Object.fromEntries(jobs.map((job) => [job.id, job.reference]));
  const personThreads = (threads ?? []).filter((thread) => jobRefs[thread.jobId]);

  const toggleActive = async () => {
    const next = !profile.is_active;
    setBusy(true);
    setNotice(null);
    try {
      await callFunction('admin-users', { action: 'set_active', userId: profile.id, active: next });
      setNotice({ tone: 'success', text: next ? 'Account enabled.' : 'Account disabled.' });
      await refresh();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const deleteData = async () => {
    setBusy(true);
    setNotice(null);
    try {
      await callFunction('admin-users', { action: 'delete_customer_data', userId: profile.id });
      navigate(basePath, { replace: true });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
      setBusy(false);
    }
  };

  const saveNotes = async () => {
    setNotesNotice(null);
    const { error } = await supabase.rpc('admin_set_partner_notes', { p_profile: profile.id, p_notes: pricingNotes });
    setNotesNotice(error ? { tone: 'error', text: 'Notes could not be saved.' } : { tone: 'success', text: 'Pricing notes saved.' });
  };

  return (
    <div className="flex flex-col gap-8">
      <Link to={basePath} className="inline-flex w-fit items-center gap-2 text-sm text-neutral-400 transition-colors hover:text-white">
        <ArrowLeft className="h-4 w-4" aria-hidden="true" />
        {kind === 'partner' ? 'All partners' : 'All customers'}
      </Link>

      <AdminPageHeader
        title={profile.full_name || profile.email || 'Account'}
        description={`${profile.role === 'partner' ? 'Partner' : 'Customer'} since ${formatDate(profile.created_at)}${profile.is_active ? '' : ' · Disabled'}`}
      />

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="Profile">
          <DetailGrid>
            <Detail label="Email" value={profile.email} />
            <Detail label="Phone" value={profile.phone} />
            <Detail label="Company" value={profile.company_name} />
            <Detail label="Country" value={profile.country} />
            <Detail label="Customer type" value={profile.customer_type === 'workshop' ? 'Workshop / Service' : profile.customer_type === 'individual' ? 'Individual' : null} />
            <Detail label="Account" value={profile.is_active ? 'Active' : 'Disabled'} />
          </DetailGrid>
          <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-5 sm:flex-row sm:flex-wrap">
            <ConfirmButton
              busy={busy}
              message={profile.is_active ? 'Disable this account? The user will be signed out and cannot log in.' : 'Enable this account? The user can log in again.'}
              confirmLabel={profile.is_active ? 'Yes, disable' : 'Yes, enable'}
              onConfirm={toggleActive}
            >
              {profile.is_active ? 'Disable account' : 'Enable account'}
            </ConfirmButton>
            <ConfirmButton
              variant="ghost"
              disabled={busy}
              message={`Permanently delete ${profile.email}'s login and files, and anonymise their ${jobs.length} job(s)? This cannot be undone.`}
              confirmLabel="Yes, delete data"
              onConfirm={deleteData}
            >
              Delete personal data (GDPR)
            </ConfirmButton>
          </div>
          <div className="mt-3">
            <NoticeLine notice={notice} />
          </div>
        </Panel>

        {profile.role === 'partner' ? (
          <Panel title="Agreed pricing notes">
            <p className="mb-4 text-xs text-neutral-500">Only visible to admins.</p>
            <TextArea id="pricing-notes" label="Pricing notes" hideLabel value={pricingNotes} maxLength={5000} onChange={(e) => setPricingNotes(e.target.value)} placeholder="Agreed prices, discounts or payment terms" />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <NoticeLine notice={notesNotice} />
              <Button size="sm" variant="secondary" onClick={saveNotes} className="sm:ml-auto">
                Save notes
              </Button>
            </div>
          </Panel>
        ) : (
          <Panel title="Payments">
            <PaymentList payments={payments} jobRefs={jobRefs} />
          </Panel>
        )}
      </div>

      <Panel title={`Jobs (${jobs.length})`}>
        {jobs.length === 0 ? (
          <p className="text-sm text-neutral-400">No jobs yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-white/[0.06]">
            {jobs.map((job) => (
              <li key={job.id}>
                <Link to={`/admin/jobs/${job.reference}`} className="flex flex-col gap-2 py-3 hover:text-brand-400 sm:flex-row sm:items-center sm:justify-between">
                  <span className="min-w-0 text-sm">
                    <span className="font-semibold text-white">{job.reference}</span>
                    <span className="text-neutral-400"> · {vehicleLabel(job)} · {SERVICE_LABELS[job.requested_service]} · {formatDate(job.created_at)}</span>
                  </span>
                  <StatusBadge status={job.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Panel>

      <div className="grid gap-6 xl:grid-cols-2">
        <Panel title="File history">
          {files.length === 0 ? (
            <p className="text-sm text-neutral-400">No files.</p>
          ) : (
            <ul className="flex flex-col gap-2 text-sm">
              {files.map((file) => (
                <li key={file.id} className="flex flex-wrap justify-between gap-2">
                  <span className="min-w-0 break-all text-neutral-200">
                    {file.file_name} <span className="text-neutral-500">· {file.kind} · {jobRefs[file.job_id]}</span>
                  </span>
                  <span className="text-neutral-500">
                    {formatFileSize(file.size_bytes)} · {formatDate(file.created_at)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </Panel>
        {profile.role === 'partner' && (
          <Panel title="Payments">
            <PaymentList payments={payments} jobRefs={jobRefs} />
          </Panel>
        )}
        <div className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold">Messages</h2>
          {personThreads.length === 0 ? (
            <EmptyRow>No messages.</EmptyRow>
          ) : (
            <MessageThreadList threads={personThreads} linkFor={(t) => `/admin/jobs/${t.reference}#messages`} emptyText="" />
          )}
        </div>
      </div>
    </div>
  );
}

function PaymentList({ payments, jobRefs }: { payments: PaymentRow[]; jobRefs: Record<string, string> }) {
  if (payments.length === 0) return <p className="text-sm text-neutral-400">No payments recorded.</p>;
  return (
    <ul className="flex flex-col gap-2 text-sm">
      {payments.map((payment) => (
        <li key={payment.id} className="flex flex-wrap justify-between gap-2 text-neutral-300">
          <span>
            {formatMoney(payment.amount, payment.currency)} · {PAYMENT_METHOD_LABELS[payment.method]} · {jobRefs[payment.job_id]}
          </span>
          <span className="text-neutral-500">{formatDate(payment.paid_at)}</span>
        </li>
      ))}
    </ul>
  );
}
