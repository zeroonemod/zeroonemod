import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, UserPlus } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TextInput } from '@/components/ui/FormField';
import { callFunction, errorMessage } from '@/lib/api';
import { isValidEmail } from '@/lib/requestForms';
import { supabase } from '@/lib/supabase';
import { Panel, PROFILE_COLUMNS, type ProfileRow } from '@/features/admin/adminShared';
import { formatDate } from '@/features/jobs/jobFormat';

const EMPTY = { fullName: '', email: '', password: '' };

/**
 * Staff accounts with limited access: jobs and their details, messages, status and notes.
 * No prices, payments, delivery, deletion, customers, partners, FAQ or settings.
 */
export function TeamPanel() {
  const [staff, setStaff] = useState<ProfileRow[] | null>(null);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.from('profiles').select(PROFILE_COLUMNS).eq('role', 'staff').order('created_at');
    setStaff((data ?? []) as ProfileRow[]);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const add = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!form.fullName.trim() || !isValidEmail(form.email)) return setNotice({ tone: 'error', text: 'Enter the name and a valid email.' });
    if (form.password.length < 8 || form.password.length > 72) return setNotice({ tone: 'error', text: 'The temporary password needs 8 to 72 characters.' });
    setBusy(true);
    setNotice(null);
    try {
      await callFunction('admin-users', { action: 'create_staff', fullName: form.fullName.trim(), email: form.email.trim(), password: form.password });
      setNotice({
        tone: 'success',
        text: `Staff account created for ${form.email.trim()}. Give them the temporary password; they choose their own at the first login.`,
      });
      setForm(EMPTY);
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusy(false);
    }
  };

  const toggle = async (person: ProfileRow) => {
    setBusyId(person.id);
    setNotice(null);
    try {
      await callFunction('admin-users', { action: 'set_active', userId: person.id, active: !person.is_active });
      setNotice({ tone: 'success', text: person.is_active ? `${person.email} can no longer log in.` : `${person.email} can log in again.` });
      await load();
    } catch (error) {
      setNotice({ tone: 'error', text: errorMessage(error) });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <Panel title="Team">
      <p className="mb-5 text-sm leading-[1.5] text-neutral-400">
        Staff log in at the same login page. They see Dashboard, Jobs and Messages: job details and files, reply to customers,
        change the status (except Delivered) and add internal notes. Prices, payments, delivery, deleting and settings stay with you.
      </p>

      {staff === null ? (
        <p className="text-sm text-neutral-400">Loading…</p>
      ) : staff.length === 0 ? (
        <p className="mb-6 text-sm text-neutral-400">No staff accounts yet.</p>
      ) : (
        <ul className="mb-6 flex flex-col divide-y divide-white/[0.06] rounded-xl border border-white/[0.08]">
          {staff.map((person) => (
            <li key={person.id} className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0 text-sm">
                <p className="flex flex-wrap items-center gap-2 font-medium text-white">
                  {person.full_name || person.email}
                  {!person.is_active && <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] text-neutral-400">Disabled</span>}
                </p>
                <p className="break-all text-neutral-400">
                  {person.email} · since {formatDate(person.created_at)}
                </p>
              </div>
              <ConfirmButton
                busy={busyId === person.id}
                className="sm:max-w-xs"
                message={person.is_active ? `Disable ${person.email}? They are signed out and cannot log in.` : `Enable ${person.email} again?`}
                confirmLabel={person.is_active ? 'Yes, disable' : 'Yes, enable'}
                onConfirm={() => toggle(person)}
              >
                {person.is_active ? 'Disable' : 'Enable'}
              </ConfirmButton>
            </li>
          ))}
        </ul>
      )}

      <form onSubmit={add} noValidate className="flex flex-col gap-4 border-t border-white/[0.08] pt-5">
        <p className="text-sm font-medium text-neutral-200">Add a staff member</p>
        <div className="grid gap-4 lg:grid-cols-3">
          <TextInput id="staff-name" label="Full name" autoComplete="off" value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
          <TextInput id="staff-email" label="Email" type="email" autoComplete="off" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
          <TextInput
            id="staff-password"
            label="Temporary password"
            type="text"
            autoComplete="off"
            hint="At least 8 characters. They must change it at the first login."
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
        </div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <NoticeLine notice={notice} />
          <Button type="submit" disabled={busy} className="sm:ml-auto">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <UserPlus className="h-4 w-4" aria-hidden="true" />}
            Add staff member
          </Button>
        </div>
      </form>
    </Panel>
  );
}
