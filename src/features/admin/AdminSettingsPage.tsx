import { useEffect, useState, type FormEvent } from 'react';
import { Download, Plus, Trash2 } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { CheckboxField, TextArea, TextInput } from '@/components/ui/FormField';
import { LoadingState } from '@/components/ui/LoadingState';
import { callFunction, errorMessage } from '@/lib/api';
import { isValidEmail } from '@/lib/requestForms';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, Panel, useAdminSettings, type AdminSettings } from '@/features/admin/adminShared';
import { exportJobsCsv, exportPaymentsCsv } from '@/features/admin/AdminJobsPage';
import { useAdminJobs } from '@/features/admin/useAdminJobs';
import { formatDate } from '@/features/jobs/jobFormat';
import { useAuth } from '@/features/auth/useAuth';
import { ChangePasswordForm } from '@/features/auth/ChangePasswordForm';
import { TeamPanel } from '@/features/admin/TeamPanel';
import { TwoFactorSettings } from '@/features/auth/TwoFactorSettings';
import type { MessageTemplate } from '@/features/jobs/JobMessages';

interface DeletionRequest {
  id: string;
  user_id: string | null;
  email: string;
  details: string | null;
  status: 'pending' | 'completed' | 'rejected';
  created_at: string;
  processed_at: string | null;
}

export function AdminSettingsPage() {
  const { settings, error, reload } = useAdminSettings();

  if (error) return <p role="alert" className="text-sm text-red-400">We could not load the settings.</p>;
  if (!settings) return <LoadingState label="Loading settings" />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Settings" description="Your account, team, email addresses, file retention, reply templates, GDPR requests and exports." />
      <AccountPanel />
      <TeamPanel />
      <EmailSettings settings={settings} onSaved={reload} />
      <div className="grid gap-6 xl:grid-cols-2">
        <GeneralSettings initialDays={settings.retention_days} initialAuto={settings.auto_delete_enabled} onSaved={reload} />
        <ExportsPanel />
      </div>
      <TemplatesPanel initial={settings.templates} onSaved={reload} />
      <DeletionRequestsPanel />
    </div>
  );
}

/** The signed-in admin: two-step verification and password. */
function AccountPanel() {
  const { user } = useAuth();
  return (
    <Panel title="Your account">
      <p className="mb-6 break-all text-sm text-neutral-400">
        Signed in as <span className="text-white">{user?.email}</span>
      </p>
      <div className="grid gap-8 xl:grid-cols-2">
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-neutral-200">Two-step verification</h3>
          <TwoFactorSettings />
        </div>
        <div className="flex flex-col gap-3">
          <h3 className="text-sm font-semibold text-neutral-200">Password</h3>
          <ChangePasswordForm idPrefix="admin-pw" />
        </div>
      </div>
    </Panel>
  );
}

/** Which address receives notifications, which is the public contact, which handles payments. */
function EmailSettings({ settings, onSaved }: { settings: AdminSettings; onSaved: () => void }) {
  const [notification, setNotification] = useState(settings.notification_email);
  const [support, setSupport] = useState(settings.support_email);
  const [billing, setBilling] = useState(settings.billing_email);
  const [notice, setNotice] = useState<Notice>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (![notification, support, billing].every(isValidEmail)) return setNotice({ tone: 'error', text: 'Enter three valid email addresses.' });
    const { error } = await supabase
      .from('admin_settings')
      .update({ notification_email: notification.trim().toLowerCase(), support_email: support.trim().toLowerCase(), billing_email: billing.trim().toLowerCase() })
      .eq('id', true);
    setNotice(error ? { tone: 'error', text: 'Email addresses could not be saved.' } : { tone: 'success', text: 'Email addresses saved.' });
    if (!error) onSaved();
  };

  return (
    <Panel title="Email addresses">
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <div className="grid gap-5 lg:grid-cols-3">
          <TextInput id="email-admin" label="Admin notifications" type="email" hint="New jobs, guest requests, customer messages, extra files and partner requests." value={notification} onChange={(e) => setNotification(e.target.value)} />
          <TextInput id="email-support" label="Info and support" type="email" hint="Public contact address. Receives the contact form; customers reply here." value={support} onChange={(e) => setSupport(e.target.value)} />
          <TextInput id="email-billing" label="Billing" type="email" hint="Sends quotations, payment links and download links; customers reply here about payments." value={billing} onChange={(e) => setBilling(e.target.value)} />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <NoticeLine notice={notice} />
          <Button type="submit" className="sm:ml-auto">
            Save email addresses
          </Button>
        </div>
      </form>
    </Panel>
  );
}

function GeneralSettings({ initialDays, initialAuto, onSaved }: { initialDays: number; initialAuto: boolean; onSaved: () => void }) {
  const [days, setDays] = useState(String(initialDays));
  const [auto, setAuto] = useState(initialAuto);
  const [notice, setNotice] = useState<Notice>(null);
  const [cleanupBusy, setCleanupBusy] = useState(false);
  const [cleanupNotice, setCleanupNotice] = useState<Notice>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const retention = Number(days);
    if (!Number.isInteger(retention) || retention < 30 || retention > 3650) return setNotice({ tone: 'error', text: 'Retention must be between 30 and 3650 days.' });
    const { error } = await supabase
      .from('admin_settings')
      .update({ retention_days: retention, auto_delete_enabled: auto })
      .eq('id', true);
    setNotice(error ? { tone: 'error', text: 'Settings could not be saved.' } : { tone: 'success', text: 'Settings saved.' });
    if (!error) onSaved();
  };

  const runCleanup = async () => {
    setCleanupBusy(true);
    setCleanupNotice(null);
    try {
      const result = await callFunction<{ pendingRemoved: number; jobsCleaned: number }>('retention-cleanup', {});
      setCleanupNotice({ tone: 'success', text: `Done. ${result.jobsCleaned} job(s) cleaned, ${result.pendingRemoved} unfinished upload(s) removed.` });
    } catch (error) {
      setCleanupNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setCleanupBusy(false);
    }
  };

  return (
    <Panel title="File retention">
      <form onSubmit={save} noValidate className="flex flex-col gap-5">
        <TextInput id="retention-days" label="File retention (days)" inputMode="numeric" hint="Between 30 and 3650 days." value={days} onChange={(e) => setDays(e.target.value)} />
        <CheckboxField id="auto-delete" checked={auto} onChange={setAuto}>
          Automatically delete job files older than the retention period (runs daily). Job records and payments are kept.
        </CheckboxField>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <NoticeLine notice={notice} />
          <Button type="submit" className="sm:ml-auto">
            Save settings
          </Button>
        </div>
      </form>
      <div className="mt-6 flex flex-col gap-3 border-t border-white/[0.08] pt-5">
        <p className="text-sm text-neutral-400">Unfinished uploads older than 24 hours are always removed. Files of a single job can be deleted from the job page.</p>
        <ConfirmButton
          busy={cleanupBusy}
          className="self-start"
          message={
            auto
              ? `Run file cleanup now? Files of jobs older than ${days} days will be permanently deleted.`
              : 'Run cleanup now? Only unfinished uploads older than 24 hours are removed (auto-delete is off).'
          }
          confirmLabel="Yes, run cleanup"
          onConfirm={runCleanup}
        >
          Run cleanup now
        </ConfirmButton>
        <NoticeLine notice={cleanupNotice} />
      </div>
    </Panel>
  );
}

function ExportsPanel() {
  const { jobs } = useAdminJobs();
  const [notice, setNotice] = useState<Notice>(null);
  return (
    <Panel title="Exports">
      <p className="mb-5 text-sm text-neutral-400">Download all jobs or all recorded payments as a CSV file for your records.</p>
      <div className="flex flex-col gap-3 sm:flex-row">
        <Button variant="secondary" size="sm" disabled={!jobs?.length} onClick={() => jobs && exportJobsCsv(jobs)}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Jobs CSV
        </Button>
        <Button variant="secondary" size="sm" onClick={() => exportPaymentsCsv().catch((e: Error) => setNotice({ tone: 'error', text: e.message }))}>
          <Download className="h-4 w-4" aria-hidden="true" />
          Payments CSV
        </Button>
      </div>
      <div className="mt-3">
        <NoticeLine notice={notice} />
      </div>
    </Panel>
  );
}

function TemplatesPanel({ initial, onSaved }: { initial: MessageTemplate[]; onSaved: () => void }) {
  const [templates, setTemplates] = useState<MessageTemplate[]>(initial);
  const [notice, setNotice] = useState<Notice>(null);

  const change = (index: number, key: 'title' | 'body', value: string) =>
    setTemplates((current) => current.map((t, i) => (i === index ? { ...t, [key]: value } : t)));

  const save = async () => {
    const clean = templates.map((t) => ({ ...t, title: t.title.trim(), body: t.body.trim() })).filter((t) => t.title && t.body);
    const { error } = await supabase.from('admin_settings').update({ templates: clean }).eq('id', true);
    setNotice(error ? { tone: 'error', text: 'Templates could not be saved.' } : { tone: 'success', text: 'Templates saved.' });
    if (!error) {
      setTemplates(clean);
      onSaved();
    }
  };

  return (
    <Panel
      title="Reply templates"
      actions={
        <Button variant="ghost" size="sm" onClick={() => setTemplates((t) => [...t, { id: crypto.randomUUID(), title: '', body: '' }])}>
          <Plus className="h-3.5 w-3.5" aria-hidden="true" />
          Add template
        </Button>
      }
    >
      <p className="mb-5 text-sm text-neutral-400">Shown as quick replies under the message box on each job.</p>
      <div className="flex flex-col gap-5">
        {templates.map((template, index) => (
          <div key={template.id} className="flex flex-col gap-3 rounded-xl border border-white/[0.08] bg-surface-sunken p-4">
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <TextInput id={`tpl-title-${template.id}`} label="Title" value={template.title} maxLength={60} onChange={(e) => change(index, 'title', e.target.value)} />
              </div>
              <button
                type="button"
                aria-label={`Delete template ${template.title}`}
                onClick={() => setTemplates((t) => t.filter((_, i) => i !== index))}
                className="inline-flex h-11 w-11 items-center justify-center rounded-lg text-neutral-400 hover:bg-white/5 hover:text-white"
              >
                <Trash2 className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
            <TextArea id={`tpl-body-${template.id}`} label="Message" value={template.body} maxLength={5000} onChange={(e) => change(index, 'body', e.target.value)} />
          </div>
        ))}
      </div>
      <div className="mt-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NoticeLine notice={notice} />
        <Button onClick={save} className="sm:ml-auto">
          Save templates
        </Button>
      </div>
    </Panel>
  );
}

function DeletionRequestsPanel() {
  const [requests, setRequests] = useState<DeletionRequest[] | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase
      .from('data_deletion_requests')
      .select('id, user_id, email, details, status, created_at, processed_at')
      .order('created_at', { ascending: false })
      .then(({ data }) => setRequests((data ?? []) as DeletionRequest[]));
  }, [version]);

  const process = async (request: DeletionRequest) => {
    if (!request.user_id) return;
    setBusyId(request.id);
    setNotice(null);
    try {
      await callFunction('admin-users', { action: 'delete_customer_data', userId: request.user_id, requestId: request.id });
      setNotice({ tone: 'success', text: `Data of ${request.email} deleted.` });
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusyId(null);
      setVersion((v) => v + 1);
    }
  };

  const setStatus = async (request: DeletionRequest, status: 'completed' | 'rejected') => {
    setBusyId(request.id);
    const { error } = await supabase.from('data_deletion_requests').update({ status, processed_at: new Date().toISOString() }).eq('id', request.id);
    setBusyId(null);
    setNotice(error ? { tone: 'error', text: 'The request could not be updated.' } : { tone: 'success', text: 'Request updated.' });
    setVersion((v) => v + 1);
  };

  return (
    <Panel title="GDPR deletion requests">
      {!requests ? (
        <LoadingState label="Loading requests" />
      ) : requests.length === 0 ? (
        <p className="text-sm text-neutral-400">No deletion requests.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-white/[0.06]">
          {requests.map((request) => (
            <li key={request.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="min-w-0 text-sm">
                <p className="break-all font-medium text-white">{request.email}</p>
                <p className="text-xs text-neutral-500">
                  Requested {formatDate(request.created_at)} · {request.status}
                  {request.processed_at && ` · processed ${formatDate(request.processed_at)}`}
                </p>
              </div>
              {request.status === 'pending' && (
                <div className="flex flex-wrap gap-2">
                  {request.user_id ? (
                    <ConfirmButton
                      variant="primary"
                      busy={busyId === request.id}
                      message={`Permanently delete the account, files and personal data of ${request.email}? Job records are anonymised. This cannot be undone.`}
                      confirmLabel="Yes, delete data"
                      onConfirm={() => process(request)}
                    >
                      Delete data
                    </ConfirmButton>
                  ) : (
                    <Button size="sm" variant="secondary" onClick={() => setStatus(request, 'completed')} disabled={busyId === request.id}>
                      Mark completed
                    </Button>
                  )}
                  <Button size="sm" variant="ghost" onClick={() => setStatus(request, 'rejected')} disabled={busyId === request.id}>
                    Reject
                  </Button>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      <div className="mt-3">
        <NoticeLine notice={notice} />
      </div>
    </Panel>
  );
}
