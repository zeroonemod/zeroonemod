import { useState, type FormEvent } from 'react';
import { KeyRound, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextInput } from '@/components/ui/FormField';
import { Wordmark } from '@/components/layout/Wordmark';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

/** First login with a temporary password (staff): the person chooses their own password. */
export function ForcePasswordChange() {
  const { refreshProfile, signOut, user } = useAuth();
  const [next, setNext] = useState('');
  const [confirm, setConfirm] = useState('');
  const [errors, setErrors] = useState<{ next?: string; confirm?: string }>({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const found: { next?: string; confirm?: string } = {};
    if (next.length < 8 || next.length > 72) found.next = 'Use between 8 and 72 characters.';
    if (confirm !== next) found.confirm = 'The passwords do not match.';
    setErrors(found);
    if (Object.keys(found).length > 0) return;
    setBusy(true);
    setError(null);
    const { error: updateError } = await supabase.auth.updateUser({ password: next });
    if (updateError) {
      setBusy(false);
      setError(updateError.message.includes('different') ? 'Choose a password different from the temporary one.' : 'The password could not be saved. Please try again.');
      return;
    }
    await supabase.rpc('clear_must_change_password');
    await refreshProfile();
    setBusy(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-canvas px-5 py-16 text-white">
      <div className="flex w-full max-w-md flex-col gap-8">
        <div className="flex justify-center">
          <Wordmark />
        </div>
        <Card padding="lg" interactive={false}>
          <form onSubmit={save} noValidate className="flex flex-col gap-6">
            <div className="flex items-start gap-3">
              <KeyRound className="mt-1 h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <h1 className="text-xl font-bold">Choose your password</h1>
                <p className="text-sm leading-[1.5] text-neutral-400">
                  You logged in with a temporary password. Choose your own to continue{user?.email ? ` as ${user.email}` : ''}.
                </p>
              </div>
            </div>
            <TextInput id="force-new" label="New password" type="password" autoComplete="new-password" maxLength={72} value={next} error={errors.next} hint="At least 8 characters." onChange={(e) => setNext(e.target.value)} />
            <TextInput id="force-confirm" label="Confirm new password" type="password" autoComplete="new-password" maxLength={72} value={confirm} error={errors.confirm} onChange={(e) => setConfirm(e.target.value)} />
            {error && <Alert>{error}</Alert>}
            <Button type="submit" size="lg" disabled={busy} className="w-full">
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Save and continue
            </Button>
            <button type="button" onClick={() => void signOut()} className="text-sm text-neutral-400 transition-colors hover:text-white">
              Log out
            </button>
          </form>
        </Card>
      </div>
    </div>
  );
}
