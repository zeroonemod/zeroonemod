import { useEffect, useMemo, useState, type FormEvent } from 'react';
import { Check, Loader2, UserPlus, X } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { LoadingState } from '@/components/ui/LoadingState';
import { SelectInput } from '@/components/ui/Select';
import { callFunction, errorMessage } from '@/lib/api';
import { isValidEmail } from '@/lib/requestForms';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, confirmAction, EmptyRow, Panel } from '@/features/admin/adminShared';
import { PeopleList, usePeople } from '@/features/admin/AdminCustomersPage';
import { useAdminJobs } from '@/features/admin/useAdminJobs';
import { formatDate } from '@/features/jobs/jobFormat';

interface PartnerRequest {
  id: string;
  company_name: string;
  contact_name: string;
  email: string;
  phone: string | null;
  country: string;
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const EMPTY_INVITE = { email: '', fullName: '', companyName: '', country: '', phone: '' };

export function AdminPartnersPage() {
  const { people: partners, error, reload: reloadPartners } = usePeople('partner');
  const { jobs } = useAdminJobs();
  const [requests, setRequests] = useState<PartnerRequest[] | null>(null);
  const [requestFilter, setRequestFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [requestNotice, setRequestNotice] = useState<Notice>(null);
  const [invite, setInvite] = useState(EMPTY_INVITE);
  const [inviteBusy, setInviteBusy] = useState(false);
  const [inviteNotice, setInviteNotice] = useState<Notice>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase
      .from('partner_requests')
      .select('id, company_name, contact_name, email, phone, country, message, status, created_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests((data ?? []) as PartnerRequest[]));
  }, [version]);

  const jobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs ?? []) if (job.user_id) counts[job.user_id] = (counts[job.user_id] ?? 0) + 1;
    return counts;
  }, [jobs]);

  const visibleRequests = (requests ?? []).filter((r) => requestFilter === 'all' || r.status === requestFilter);

  const approve = async (request: PartnerRequest) => {
    if (!confirmAction(`Approve ${request.company_name} and send a partner invitation to ${request.email}?`)) return;
    setBusyId(request.id);
    setRequestNotice(null);
    try {
      const result = await callFunction<{ invited: boolean }>('admin-users', {
        action: 'invite_partner',
        requestId: request.id,
        email: request.email,
        fullName: request.contact_name,
        companyName: request.company_name,
        country: request.country,
        phone: request.phone ?? '',
      });
      setRequestNotice({
        tone: 'success',
        text: result.invited ? `Approved. An invitation was emailed to ${request.email}.` : `Approved. The existing account for ${request.email} is now a partner.`,
      });
      setVersion((v) => v + 1);
      reloadPartners();
    } catch (err) {
      setRequestNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setBusyId(null);
    }
  };

  const reject = async (request: PartnerRequest) => {
    if (!confirmAction(`Reject the request from ${request.company_name}?`)) return;
    setBusyId(request.id);
    const { error: updateError } = await supabase
      .from('partner_requests')
      .update({ status: 'rejected', reviewed_at: new Date().toISOString() })
      .eq('id', request.id);
    setBusyId(null);
    setRequestNotice(updateError ? { tone: 'error', text: 'The request could not be updated.' } : { tone: 'success', text: 'Request rejected.' });
    setVersion((v) => v + 1);
  };

  const sendInvite = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!isValidEmail(invite.email) || !invite.fullName.trim() || !invite.companyName.trim()) {
      setInviteNotice({ tone: 'error', text: 'Enter an email, contact name and company name.' });
      return;
    }
    setInviteBusy(true);
    setInviteNotice(null);
    try {
      const result = await callFunction<{ invited: boolean }>('admin-users', { action: 'invite_partner', ...invite });
      setInviteNotice({ tone: 'success', text: result.invited ? 'Invitation sent.' : 'The existing account is now a partner.' });
      setInvite(EMPTY_INVITE);
      reloadPartners();
    } catch (err) {
      setInviteNotice({ tone: 'error', text: errorMessage(err) });
    } finally {
      setInviteBusy(false);
    }
  };

  if (error) return <p role="alert" className="text-sm text-red-400">We could not load partners.</p>;
  if (!partners || !requests) return <LoadingState label="Loading partners" />;

  const pendingCount = requests.filter((r) => r.status === 'pending').length;

  return (
    <div className="flex flex-col gap-10">
      <AdminPageHeader title="Partners" description="Partner access is only granted here. A request from the website never creates access on its own." />

      <section className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="text-lg font-semibold">
            Partner requests {pendingCount > 0 && <span className="ml-1 text-brand-400">({pendingCount} pending)</span>}
          </h2>
          <div className="sm:w-56">
            <SelectInput
              id="request-filter"
              label="Show"
              hideLabel
              value={requestFilter}
              onChange={(e) => setRequestFilter(e.target.value as typeof requestFilter)}
              options={[
                { value: 'pending', label: 'Pending' },
                { value: 'approved', label: 'Approved' },
                { value: 'rejected', label: 'Rejected' },
                { value: 'all', label: 'All requests' },
              ]}
            />
          </div>
        </div>
        <NoticeLine notice={requestNotice} />
        {visibleRequests.length === 0 ? (
          <EmptyRow>No {requestFilter === 'all' ? '' : requestFilter} requests.</EmptyRow>
        ) : (
          <ul className="flex flex-col gap-3">
            {visibleRequests.map((request) => (
              <li key={request.id} className="flex flex-col gap-4 rounded-xl border border-white/[0.08] bg-surface p-5 lg:flex-row lg:items-start lg:justify-between">
                <div className="flex min-w-0 flex-col gap-1.5 text-sm">
                  <p className="font-semibold text-white">
                    {request.company_name} <span className="font-normal text-neutral-400">· {request.contact_name}</span>
                  </p>
                  <p className="break-all text-neutral-300">
                    {request.email}
                    {request.phone && ` · ${request.phone}`} · {request.country}
                  </p>
                  {request.message && <p className="whitespace-pre-wrap break-words text-neutral-400">{request.message}</p>}
                  <p className="text-xs text-neutral-500">
                    {formatDate(request.created_at)} · {request.status}
                  </p>
                </div>
                {request.status === 'pending' && (
                  <div className="flex shrink-0 gap-2">
                    <Button size="sm" onClick={() => approve(request)} disabled={busyId === request.id}>
                      {busyId === request.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Check className="h-3.5 w-3.5" aria-hidden="true" />}
                      Approve
                    </Button>
                    <Button size="sm" variant="secondary" onClick={() => reject(request)} disabled={busyId === request.id}>
                      <X className="h-3.5 w-3.5" aria-hidden="true" />
                      Reject
                    </Button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold">Partner accounts ({partners.length})</h2>
        {partners.length === 0 ? <EmptyRow>No partner accounts yet.</EmptyRow> : <PeopleList people={partners} basePath="/admin/partners" jobCounts={jobCounts} />}
      </section>

      <Panel title="Invite a partner">
        <form onSubmit={sendInvite} noValidate className="flex flex-col gap-5">
          <div className="grid gap-5 sm:grid-cols-2">
            <TextInput id="invite-email" label="Email" type="email" value={invite.email} onChange={(e) => setInvite({ ...invite, email: e.target.value })} />
            <TextInput id="invite-name" label="Contact name" value={invite.fullName} onChange={(e) => setInvite({ ...invite, fullName: e.target.value })} />
            <TextInput id="invite-company" label="Company name" value={invite.companyName} onChange={(e) => setInvite({ ...invite, companyName: e.target.value })} />
            <TextInput id="invite-country" label="Country" optional value={invite.country} onChange={(e) => setInvite({ ...invite, country: e.target.value })} />
            <TextInput id="invite-phone" label="Phone" optional value={invite.phone} onChange={(e) => setInvite({ ...invite, phone: e.target.value })} />
          </div>
          <p className="text-xs text-neutral-500">
            New addresses receive an email to set up their account. An existing customer account is switched to partner and keeps its history.
          </p>
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <NoticeLine notice={inviteNotice} />
            <Button type="submit" disabled={inviteBusy} className="sm:ml-auto">
              {inviteBusy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
              Invite partner
            </Button>
          </div>
        </form>
      </Panel>
    </div>
  );
}
