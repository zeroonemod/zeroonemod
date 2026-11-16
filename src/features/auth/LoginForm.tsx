import { useRef, useState, type FormEvent } from 'react';
import { Loader2, Mail } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextInput } from '@/components/ui/FormField';
import { isValidEmail } from '@/lib/requestForms';
import { supabase } from '@/lib/supabase';

type Mode = 'password' | 'magic' | 'reset';

const MODE_COPY: Record<Mode, { submit: string; intro: string }> = {
  password: { submit: 'Log in', intro: 'Log in with your email and password.' },
  magic: { submit: 'Email me a login link', intro: 'We will email you a one-time link to sign in. No password needed.' },
  reset: { submit: 'Send reset link', intro: 'Enter your email and we will send you a link to choose a new password.' },
};

function describeAuthError(error: { message: string; status?: number }): string {
  if (error.status === 429) return 'Too many attempts. Please wait a few minutes and try again.';
  if (error.message.includes('Invalid login credentials')) return 'The email or password is not correct.';
  if (error.message.includes('Email not confirmed')) return 'Please confirm your email address first.';
  return 'We could not sign you in. Please try again.';
}

export function LoginForm() {
  const [mode, setMode] = useState<Mode>('password');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [emailError, setEmailError] = useState<string | undefined>();
  const [formError, setFormError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const failures = useRef(0);
  const lockedUntil = useRef(0);

  const switchMode = (next: Mode) => {
    setMode(next);
    setFormError(null);
    setNotice(null);
    setEmailError(undefined);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setFormError(null);
    setNotice(null);

    if (!isValidEmail(email)) {
      setEmailError('Enter a valid email address.');
      return;
    }
    setEmailError(undefined);
    if (mode === 'password' && !password) {
      setFormError('Enter your password.');
      return;
    }

    if (mode === 'password' && Date.now() < lockedUntil.current) {
      setFormError('Too many attempts. Please wait a minute and try again, or use a login link.');
      return;
    }

    setLoading(true);
    const origin = window.location.origin;
    const cleanEmail = email.trim();

    if (mode === 'password') {
      const { error } = await supabase.auth.signInWithPassword({ email: cleanEmail, password });
      if (error) {
        setFormError(describeAuthError(error));
        failures.current += 1;
        if (failures.current >= 5) {
          failures.current = 0;
          lockedUntil.current = Date.now() + 60_000;
        }
      }
    } else if (mode === 'magic') {
      const { error } = await supabase.auth.signInWithOtp({
        email: cleanEmail,
        options: { emailRedirectTo: `${origin}/login`, shouldCreateUser: false },
      });
      if (error) setFormError('We could not send the link. Check the address or try again shortly.');
      else setNotice('If an account exists for this email, a login link is on its way. Check your inbox.');
    } else {
      const { error } = await supabase.auth.resetPasswordForEmail(cleanEmail, {
        redirectTo: `${origin}/dashboard/profile?reset=1`,
      });
      if (error && error.status === 429) setFormError('Too many attempts. Please wait a few minutes and try again.');
      else setNotice('If an account exists for this email, a reset link is on its way.');
    }
    setLoading(false);
  };

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <p className="text-sm leading-[1.5] text-neutral-400">{MODE_COPY[mode].intro}</p>

      <TextInput
        id="login-email"
        label="Email"
        type="email"
        inputMode="email"
        autoComplete="email"
        maxLength={254}
        value={email}
        onChange={(event) => setEmail(event.target.value)}
        error={emailError}
      />

      {mode === 'password' && (
        <div className="flex flex-col gap-2">
          <TextInput
            id="login-password"
            label="Password"
            type="password"
            autoComplete="current-password"
            maxLength={72}
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          <button
            type="button"
            onClick={() => switchMode('reset')}
            className="self-end text-xs text-neutral-400 underline-offset-4 transition-colors hover:text-white hover:underline"
          >
            Forgot password?
          </button>
        </div>
      )}

      {formError && <Alert>{formError}</Alert>}
      {notice && <Alert tone="info">{notice}</Alert>}

      <Button type="submit" size="lg" disabled={loading} className="w-full">
        {loading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
            Please wait
          </>
        ) : (
          MODE_COPY[mode].submit
        )}
      </Button>

      <div className="flex flex-col gap-3 border-t border-white/[0.08] pt-6 text-sm">
        {mode !== 'magic' ? (
          <button
            type="button"
            onClick={() => switchMode('magic')}
            className="flex items-center justify-center gap-2 text-neutral-300 transition-colors hover:text-white"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email me a login link instead
          </button>
        ) : (
          <button type="button" onClick={() => switchMode('password')} className="text-neutral-300 transition-colors hover:text-white">
            Back to password login
          </button>
        )}
      </div>
    </form>
  );
}
