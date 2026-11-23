import { useState, type FormEvent } from 'react';
import { Loader2 } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { supabase } from '@/lib/supabase';

/** Change the signed-in user's password (used in the admin settings). */
export function ChangePasswordForm({ idPrefix = 'pw' }: { idPrefix?: string }) {
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: { next?: string; confirm?: string } = {};
    if (next.length < 8 || next.length > 72) found.next = 'Use between 8 and 72 characters.';
    if (confirm !== next) found.confirm = 'The passwords do not match.';
    setErrors(found);
    setNotice(null);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    const { error } = await supabase.auth.updateUser({ password: next });
    setBusy(false);
    if (error) {
      setNotice({ tone: 'error', text: 'The password could not be changed. Log in again and retry.' });
      return;
    }
    setNext('');
    setConfirm('');
    setNotice({ tone: 'success', text: 'Your password has been changed.' });
  };

  return (
    <form onSubmit={save} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <TextInput id={`${idPrefix}-new`} label="New password" type="password" autoComplete="new-password" maxLength={72} value={next} error={errors.next} hint="At least 8 characters." onChange={(e) => setNext(e.target.value)} />
        <TextInput id={`${idPrefix}-confirm`} label="Confirm new password" type="password" autoComplete="new-password" maxLength={72} value={confirm} error={errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <NoticeLine notice={notice} />
        <Button type="submit" variant="secondary" size="sm" disabled={busy} className="sm:ml-auto">
          {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
          Update password
        </Button>
      </div>
    </form>
  );
}
