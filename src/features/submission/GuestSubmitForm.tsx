import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckboxField, TextArea, TextInput } from '@/components/ui/FormField';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { errorMessage } from '@/lib/api';
import { isValidEmail } from '@/lib/requestForms';
import { AttachedFiles } from '@/features/submission/AttachedFiles';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import { submitGuest, type GuestDetails } from '@/features/submission/submitJob';

const CONTACT_REQUIRED = 'Please enter an email or a phone number so we can contact you.';

type GuestErrors = Partial<Record<'files' | 'email' | 'phone' | 'contact' | 'notes' | 'privacyConsent', string>>;

/** International numbers with an optional leading +, 6 to 15 digits. */
export function isValidPhone(value: string): boolean {
  const trimmed = value.trim();
  const digits = trimmed.replace(/\D/g, '');
  return /^\+?[0-9][0-9 ().-]*[0-9]$/.test(trimmed) && digits.length >= 6 && digits.length <= 15;
}

export function validateGuest(details: GuestDetails, hasFiles: boolean): GuestErrors {
  const errors: GuestErrors = {};
  const email = details.email.trim();
  const phone = details.phone.trim();
  if (!hasFiles) errors.files = 'Upload at least one original file.';
  if (!email && !phone) errors.contact = CONTACT_REQUIRED;
  if (email && !isValidEmail(email)) errors.email = 'Enter a valid email address.';
  if (phone && !isValidPhone(phone)) errors.phone = 'Enter a valid phone number, for example +34 600 000 000.';
  if (details.notes.length > 1000) errors.notes = 'Please keep your message under 1000 characters.';
  if (!details.privacyConsent) errors.privacyConsent = 'You must accept the privacy terms to submit.';
  return errors;
}

const EMPTY: GuestDetails = { email: '', phone: '', notes: '', privacyConsent: false, website: '' };

/** Single-step guest submission: files plus an email and/or phone. No account is created. */
export function GuestSubmitForm({ onBack }: { onBack: () => void }) {
  const { files, clearFiles } = useSubmissionFiles();
  const [details, setDetails] = useState<GuestDetails>(EMPTY);
  const [errors, setErrors] = useState<GuestErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [reference, setReference] = useState<string | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const update = <K extends keyof GuestDetails>(key: K, value: GuestDetails[K]) => {
    setDetails((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const next = { ...current };
      delete next[key as keyof GuestErrors];
      if (key === 'email' || key === 'phone') delete next.contact;
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const nextErrors = validateGuest(details, files.length > 0);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) {
      requestAnimationFrame(() =>
        (formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? (nextErrors.contact ? document.getElementById('guest-email') : null))?.focus(),
      );
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const ref = await submitGuest(details, files, (done, total) =>
        setProgress(done < total ? `Uploading file ${done + 1} of ${total}` : 'Sending'),
      );
      clearFiles();
      setReference(ref);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(errorMessage(error, 'We could not send your file. Your details are still here, so please try again.'));
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  if (reference) {
    return (
      <Card padding="lg" className="flex flex-col items-center gap-6 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-surface-raised">
          <Check className="h-6 w-6" aria-hidden="true" />
        </span>
        <h2 className="text-2xl font-bold leading-[1.2] sm:text-3xl">Thank you for submitting your file. We will contact you.</h2>
        <p className="text-sm text-neutral-400">
          Reference <span className="font-mono text-white">{reference}</span>
        </p>
        <ButtonLink to="/" variant="secondary">
          Back to home
        </ButtonLink>
      </Card>
    );
  }

  const contactError = errors.contact;

  return (
    <Card padding="lg">
      <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={onBack}
            className="inline-flex w-fit items-center gap-2 text-sm text-neutral-400 transition-colors duration-200 hover:text-white"
          >
            <ArrowLeft className="h-4 w-4" aria-hidden="true" />
            Back
          </button>
          <h2 className="text-2xl font-bold leading-[1.2] tracking-tight sm:text-3xl">Continue as guest</h2>
        </div>

        <div className="flex flex-col gap-4">
          <p className="text-sm font-medium text-neutral-200">Original file(s)</p>
          <AttachedFiles error={errors.files} />
        </div>

        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="guest-email"
            label="Email"
            optional
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={details.email}
            onChange={(event) => update('email', event.target.value)}
            error={errors.email}
          />
          <TextInput
            id="guest-phone"
            label="Phone number"
            optional
            type="tel"
            inputMode="tel"
            autoComplete="tel"
            maxLength={30}
            placeholder="+34 600 000 000"
            value={details.phone}
            onChange={(event) => update('phone', event.target.value)}
            error={errors.phone}
          />
          {contactError && (
            <p role="alert" className="-mt-3 text-sm text-red-400 sm:col-span-2">
              {contactError}
            </p>
          )}
        </div>

        <TextArea
          id="guest-notes"
          label="Message / notes"
          optional
          maxLength={1000}
          className="min-h-24"
          value={details.notes}
          onChange={(event) => update('notes', event.target.value)}
          error={errors.notes}
        />

        <HoneypotField value={details.website} onChange={(value) => update('website', value)} />

        <CheckboxField
          id="guest-privacy"
          checked={details.privacyConsent}
          onChange={(checked) => update('privacyConsent', checked)}
          error={errors.privacyConsent}
        >
          I agree that ZEROONEMOD may process my contact details and my submitted files to handle this request, as described in the{' '}
          <Link to="/privacy-policy" className="text-white underline underline-offset-4 hover:text-neutral-300">
            Privacy Policy
          </Link>
          . <span className="text-neutral-500">Required.</span>
        </CheckboxField>

        {submitError && <Alert>{submitError}</Alert>}

        <div className="flex border-t border-white/[0.08] pt-6 sm:justify-end">
          <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto sm:min-w-52">
            {submitting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                {progress ?? 'Sending file'}
              </>
            ) : (
              'Submit'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
