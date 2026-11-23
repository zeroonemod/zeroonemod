import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Alert, NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { ConfirmButton } from '@/components/ui/ConfirmButton';
import { TextInput } from '@/components/ui/FormField';
import { errorMessage } from '@/lib/api';
import { supabase } from '@/lib/supabase';

/**
 * Supabase returns the QR code as "data:image/svg+xml;utf-8,<svg…>", which browsers do not always
 * render. Re-encode the SVG as a standard data URL.
 */
function qrImageSource(raw: string): string {
  const comma = raw.indexOf(',');
  if (!raw.startsWith('data:image/svg+xml') || comma === -1) return raw;
  let svg = raw.slice(comma + 1);
  if (raw.slice(0, comma).includes(';base64')) return raw;
  try {
    if (!svg.trimStart().startsWith('<')) svg = decodeURIComponent(svg);
  } catch {
    return raw;
  }
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

interface Enrollment {
  factorId: string;
  qrCode: string;
  secret: string;
}

/**
 * Two-step verification with an authenticator app (Google Authenticator, Microsoft Authenticator,
 * Authy...). Used on the customer profile and in the admin settings.
 */
export function TwoFactorSettings() {
  const [verifiedId, setVerifiedId] = useState<string | null | undefined>(undefined);
  const [enrollment, setEnrollment] = useState<Enrollment | null>(null);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const load = useCallback(async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    setVerifiedId(data?.totp?.find((f) => f.status === 'verified')?.id ?? null);
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const start = async () => {
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      // Remove any setup that was started earlier but never finished.
      const { data: existing } = await supabase.auth.mfa.listFactors();
      for (const factor of existing?.all ?? []) {
        if (factor.status !== 'verified') await supabase.auth.mfa.unenroll({ factorId: factor.id });
      }
      const { data, error: enrollError } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName: `ZEROONEMOD ${Date.now()}` });
      if (enrollError || !data) throw enrollError ?? new Error('Setup could not start.');
      setEnrollment({ factorId: data.id, qrCode: qrImageSource(data.totp.qr_code), secret: data.totp.secret });
    } catch (startError) {
      setError(errorMessage(startError, 'Two-step verification could not be started. Please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const confirm = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!enrollment) return;
    const clean = code.replace(/\s/g, '');
    if (!/^\d{6}$/.test(clean)) {
      setError('Enter the 6-digit code shown in your authenticator app.');
      return;
    }
    setBusy(true);
    setError(null);
    const { error: verifyError } = await supabase.auth.mfa.challengeAndVerify({ factorId: enrollment.factorId, code: clean });
    setBusy(false);
    if (verifyError) {
      setError('That code is not correct. Check the time on your phone and try the current code.');
      return;
    }
    setEnrollment(null);
    setCode('');
    setNotice({ tone: 'success', text: 'Two-step verification is on. You will be asked for a code each time you log in.' });
    await load();
  };

  const turnOff = async () => {
    if (!verifiedId) return;
    setBusy(true);
    setNotice(null);
    const { error: removeError } = await supabase.auth.mfa.unenroll({ factorId: verifiedId });
    setBusy(false);
    if (removeError) {
      setNotice({ tone: 'error', text: 'It could not be turned off. Log out, log in again with your code, and retry.' });
      return;
    }
    await supabase.auth.refreshSession();
    setNotice({ tone: 'success', text: 'Two-step verification is off.' });
    await load();
  };

  if (verifiedId === undefined) return <p className="text-sm text-neutral-400">Loading…</p>;

  return (
    <div className="flex flex-col gap-5">
      {verifiedId ? (
        <>
          <p className="flex items-start gap-2 text-sm text-neutral-200">
            <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
            Two-step verification is on. Logging in needs your password and a code from your authenticator app.
          </p>
          <ConfirmButton
            busy={busy}
            className="self-start"
            message="Turn off two-step verification? Logging in will only need your password."
            confirmLabel="Yes, turn off"
            onConfirm={turnOff}
          >
            Turn off two-step verification
          </ConfirmButton>
        </>
      ) : enrollment ? (
        <form onSubmit={confirm} noValidate className="flex flex-col gap-5">
          <ol className="flex list-decimal flex-col gap-2 pl-5 text-sm leading-[1.5] text-neutral-300">
            <li>Install an authenticator app on your phone, for example Google Authenticator or Microsoft Authenticator.</li>
            <li>Scan this QR code with the app, or type the key below.</li>
            <li>Enter the 6-digit code the app shows.</li>
          </ol>
          <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center">
            <img src={enrollment.qrCode} alt="QR code for your authenticator app" width={176} height={176} className="h-44 w-44 rounded-lg bg-white p-2" />
            <div className="min-w-0">
              <p className="text-xs uppercase tracking-wider text-neutral-500">Key</p>
              <p className="break-all font-mono text-sm text-neutral-100">{enrollment.secret}</p>
            </div>
          </div>
          <TextInput
            id="mfa-setup-code"
            label="6-digit code"
            inputMode="numeric"
            autoComplete="one-time-code"
            maxLength={7}
            placeholder="123456"
            value={code}
            onChange={(event) => setCode(event.target.value)}
            className="font-mono tracking-[0.3em] sm:max-w-xs"
          />
          {error && <Alert>{error}</Alert>}
          <div className="flex flex-col-reverse gap-3 sm:flex-row">
            <Button variant="ghost" onClick={() => setEnrollment(null)} disabled={busy}>
              Cancel
            </Button>
            <Button type="submit" disabled={busy}>
              {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
              Turn on
            </Button>
          </div>
        </form>
      ) : (
        <>
          <p className="text-sm leading-[1.5] text-neutral-400">
            Add a second step to your login: after your password, you enter a code from an authenticator app on your phone.
          </p>
          {error && <Alert>{error}</Alert>}
          <Button variant="secondary" onClick={start} disabled={busy} className="self-start">
            {busy && <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />}
            Set up two-step verification
          </Button>
        </>
      )}
      <NoticeLine notice={notice} />
    </div>
  );
}
