import { useEffect, useState, type ChangeEvent, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { useAuth } from '@/features/auth/useAuth';
import { TwoFactorSettings } from '@/features/auth/TwoFactorSettings';
import { supabase } from '@/lib/supabase';

export function CustomerProfile() {
  const { user, profile, refreshProfile } = useAuth();
  const [searchParams] = useSearchParams();
  const isReset = searchParams.get('reset') === '1';
  const [details, setDetails] = useState({
    full_name: profile?.full_name ?? '',
    company_name: profile?.company_name ?? '',
    country: profile?.country ?? '',
    phone: profile?.phone ?? '',
  });
  const [savingDetails, setSavingDetails] = useState(false);
  const [detailsNotice, setDetailsNotice] = useState<Notice>(null);

  const [passwords, setPasswords] = useState({ next: '', confirm: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordNotice, setPasswordNotice] = useState<Notice>(null);
  const [passwordErrors, setPasswordErrors] = useState<{ next?: string; confirm?: string }>({});

  const [deletionRequested, setDeletionRequested] = useState(false);
  const [confirmingDeletion, setConfirmingDeletion] = useState(false);
  const [deletionSending, setDeletionSending] = useState(false);
  const [deletionNotice, setDeletionNotice] = useState<Notice>(null);

  useEffect(() => {
    if (isReset) document.getElementById('password')?.scrollIntoView({ block: 'center' });
  }, [isReset]);

  const saveDetails = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!user) return;
    setSavingDetails(true);
    setDetailsNotice(null);
    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: details.full_name.trim() || null,
        company_name: details.company_name.trim() || null,
        country: details.country.trim() || null,
        phone: details.phone.trim() || null,
      })
      .eq('id', user.id);
    setSavingDetails(false);
    if (error) {
      setDetailsNotice({ tone: 'error', text: 'Your details could not be saved. Please try again.' });
      return;
    }
    await refreshProfile();
    setDetailsNotice({ tone: 'success', text: 'Your details have been saved.' });
  };

  const changePassword = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors: { next?: string; confirm?: string } = {};
    if (passwords.next.length < 8) errors.next = 'Use at least 8 characters.';
    if (passwords.confirm !== passwords.next) errors.confirm = 'The passwords do not match.';
    setPasswordErrors(errors);
    setPasswordNotice(null);
    if (Object.keys(errors).length > 0) return;

    setSavingPassword(true);
    const { error } = await supabase.auth.updateUser({ password: passwords.next });
    setSavingPassword(false);
    if (error) {
      setPasswordNotice({ tone: 'error', text: 'We could not change your password. Please sign in again and retry.' });
      return;
    }
    setPasswords({ next: '', confirm: '' });
    setPasswordNotice({ tone: 'success', text: 'Your password has been changed.' });
  };

  const requestDeletion = async () => {
    if (!user) return;
    setDeletionSending(true);
    setDeletionNotice(null);
    const { error } = await supabase.from('data_deletion_requests').insert({
      details: 'Requested from the customer profile page.',
    });
    setDeletionSending(false);
    if (error) {
      setDeletionNotice({ tone: 'error', text: 'Your request could not be sent. Please try again.' });
      return;
    }
    setDeletionRequested(true);
    setConfirmingDeletion(false);
  };

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card padding="lg" className="lg:col-span-2">
        <h2 className="text-lg font-semibold text-white">Your details</h2>
        <p className="mt-1 text-sm text-neutral-400">Signed in as {user?.email}</p>
        <form onSubmit={saveDetails} className="mt-6 grid gap-5 sm:grid-cols-2">
          <TextInput id="profile-name" label="Full name" value={details.full_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setDetails({ ...details, full_name: e.target.value })} autoComplete="name" />
          <TextInput id="profile-phone" label="Phone" type="tel" optional value={details.phone} onChange={(e: ChangeEvent<HTMLInputElement>) => setDetails({ ...details, phone: e.target.value })} autoComplete="tel" />
          <TextInput id="profile-company" label="Company" optional value={details.company_name} onChange={(e: ChangeEvent<HTMLInputElement>) => setDetails({ ...details, company_name: e.target.value })} autoComplete="organization" />
          <TextInput id="profile-country" label="Country" optional value={details.country} onChange={(e: ChangeEvent<HTMLInputElement>) => setDetails({ ...details, country: e.target.value })} autoComplete="country-name" />
          <div className="flex flex-col gap-3 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between">
            <NoticeLine notice={detailsNotice} />
            <Button type="submit" disabled={savingDetails} className="w-full sm:ml-auto sm:w-auto">
              {savingDetails && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save details
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="lg">
        <h2 id="password" className="scroll-mt-24 text-lg font-semibold text-white">{isReset ? 'Choose a new password' : 'Change password'}</h2>
        {isReset && <p className="mt-2 text-sm text-neutral-400">You are signed in through your email link. Set a password to log in with it next time.</p>}
        <form onSubmit={changePassword} className="mt-6 flex flex-col gap-5" noValidate>
          <TextInput id="profile-new-password" label="New password" type="password" autoComplete="new-password" value={passwords.next} error={passwordErrors.next} hint="At least 8 characters." onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswords({ ...passwords, next: e.target.value })} />
          <TextInput id="profile-confirm-password" label="Confirm new password" type="password" autoComplete="new-password" value={passwords.confirm} error={passwordErrors.confirm} onChange={(e: ChangeEvent<HTMLInputElement>) => setPasswords({ ...passwords, confirm: e.target.value })} />
          <div className="flex flex-col gap-3">
            <NoticeLine notice={passwordNotice} />
            <Button type="submit" variant="secondary" disabled={savingPassword} className="w-full sm:w-auto sm:self-start">
              {savingPassword && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Update password
            </Button>
          </div>
        </form>
      </Card>

      <Card padding="lg">
        <h2 className="mb-4 text-lg font-semibold text-white">Two-step verification</h2>
        <TwoFactorSettings />
      </Card>

      <Card padding="lg">
        <h2 className="text-lg font-semibold text-white">Your data</h2>
        <p className="mt-2 text-sm leading-[1.5] text-neutral-400">
          You can ask us to delete your personal data. We will review the request and confirm once it is complete. Some records may be kept where the law requires it.
        </p>
        <div className="mt-6 flex flex-col gap-4">
          <NoticeLine notice={deletionNotice} />
          {deletionRequested ? (
            <p role="status" className="text-sm text-neutral-200">Your deletion request has been received. We will be in touch by email.</p>
          ) : confirmingDeletion ? (
            <div className="flex flex-col gap-4 rounded-lg border border-red-500/30 bg-red-500/5 p-4">
              <p className="text-sm text-neutral-200">Are you sure? This request cannot be undone once it is processed.</p>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Button variant="secondary" onClick={() => setConfirmingDeletion(false)} className="w-full sm:w-auto">
                  Cancel
                </Button>
                <Button onClick={requestDeletion} disabled={deletionSending} className="w-full sm:w-auto">
                  {deletionSending && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
                  Confirm deletion request
                </Button>
              </div>
            </div>
          ) : (
            <Button variant="secondary" onClick={() => setConfirmingDeletion(true)} className="w-full sm:w-auto sm:self-start">
              Request deletion of my data
            </Button>
          )}
        </div>
      </Card>
    </div>
  );
}
