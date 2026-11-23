import { useEffect, useState, type FormEvent } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/features/auth/useAuth';

/** Second login step: the 6-digit code from the authenticator app. */
export function MfaChallenge() {
  const { signOut } = useAuth();
  const [factorId, setFactorId] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.mfa.listFactors().then(({ data }) => {
      const factor = data?.totp?.find((f) => f.status === 'verified');
      if (factor) setFactorId(factor.id);
      else setError('No authenticator is set up for this account. Please log in again.');
    });
  }, []);

  const verify = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const clean = code.replace(/\s/g, '');
    if (!factorId || !/^\d{6}$/.test(clean)) {
      setError('Enter the 6-digit code from your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId, code: clean });
    setBusy(false);
    if (verifyError) {
      setError(verifyError.status === 429 ? 'Too many attempts. Please wait a minute and try again.' : 'That code is not correct or has expired. Try the current code.');
      setCode('');
    }
    // On success the session is upgraded and the page continues automatically.
  };

  return (
    <form onSubmit={verify} noValidate className="flex flex-col gap-6">
      <div className="flex items-start gap-3">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-brand-500" aria-hidden="true" />
        <p className="text-sm leading-[1.5] text-neutral-300">
          Two-step verification is on for this account. Open your authenticator app and enter the 6-digit code for ZEROONEMOD.
        </p>
      </div>
      <TextInput
        id="mfa-code"
        label="Verification code"
        inputMode="numeric"
        autoComplete="one-time-code"
        autoFocus
        maxLength={7}
        placeholder="123456"
        value={code}
        onChange={(event) => setCode(event.target.value)}
        className="text-center font-mono text-lg tracking-[0.4em]"
      />
      {error && <Alert>{error}</Alert>}
      <Button type="submit" size="lg" disabled={busy || !factorId} className="w-full">
        {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
        Verify
      </Button>
      <button type="button" onClick={() => void signOut()} className="text-sm text-neutral-400 transition-colors hover:text-white">
        Use a different account
      </button>
    </form>
  );
}
