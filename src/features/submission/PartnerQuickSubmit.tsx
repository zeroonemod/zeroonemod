import { useRef, useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { Building2, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckboxField } from '@/components/ui/FormField';
import { errorMessage } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import { isProfileComplete, profileToForm } from '@/features/submission/accountDetails';
import { ConfirmationCard } from '@/features/submission/ConfirmationCard';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import { submitJob, type SubmitResult } from '@/features/submission/submitJob';
import { usePreviousVehicles } from '@/features/submission/usePreviousVehicles';
import { validateAllSteps } from '@/features/submission/validation';
import { YourFileStep } from '@/features/submission/steps/YourFileStep';
import { VehicleStep } from '@/features/submission/steps/VehicleStep';
import { INITIAL_FORM, type FormErrors, type StepProps, type WizardForm } from '@/features/submission/types';

/** Faster single-page submission for approved partners, using their saved company details. */
export function PartnerQuickSubmit() {
  const { user, profile } = useAuth();
  const { files, clearFiles } = useSubmissionFiles();
  const previousVehicles = usePreviousVehicles(true);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const account = user && profile ? profileToForm(user.email ?? '', profile) : null;
  const complete = account ? isProfileComplete(account) : false;
  const effectiveForm: WizardForm = { ...form, ...(account ?? {}), customerType: 'workshop', password: '' };

  const update: StepProps['update'] = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (submitting) return;
    const allErrors = validateAllSteps(effectiveForm, files.length > 0);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      requestAnimationFrame(() => formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus());
      return;
    }
    setSubmitting(true);
    setSubmitError(null);
    try {
      const submitted = await submitJob(effectiveForm, files, (done, total) =>
        setProgress(done < total ? `Uploading file ${done + 1} of ${total}` : 'Creating the job'),
      );
      clearFiles();
      setResult(submitted);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(errorMessage(error, 'We could not send this submission. Please try again.'));
    } finally {
      setSubmitting(false);
      setProgress(null);
    }
  };

  if (result) {
    return (
      <ConfirmationCard
        result={result}
        onSubmitAnother={() => {
          setForm(INITIAL_FORM);
          setErrors({});
          setResult(null);
        }}
      />
    );
  }

  if (!complete) {
    return (
      <Card padding="lg" className="flex flex-col gap-4">
        <h2 className="text-lg font-semibold text-white">Complete your company details first</h2>
        <p className="text-sm leading-[1.5] text-neutral-400">
          The quick submission form uses your saved company details. Please add your full name, company and country in your profile.
        </p>
        <Link to="/dashboard/profile" className="text-sm text-white underline underline-offset-4 hover:text-neutral-300">
          Go to profile
        </Link>
      </Card>
    );
  }

  const stepProps: StepProps = { form: effectiveForm, errors, update };

  return (
    <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="flex items-start gap-3 rounded-xl border border-white/[0.08] bg-surface px-5 py-4 text-sm text-neutral-300">
        <Building2 className="mt-0.5 h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
        <span className="min-w-0 break-words">
          Submitting as <span className="text-white">{effectiveForm.companyName}</span> · {effectiveForm.firstName} {effectiveForm.lastName} ·{' '}
          {effectiveForm.email}
        </span>
      </div>

      <Card padding="lg" className="flex flex-col gap-8">
        <h2 className="text-xl font-semibold text-white">File and service</h2>
        <YourFileStep {...stepProps} />
      </Card>

      <Card padding="lg" className="flex flex-col gap-8">
        <h2 className="text-xl font-semibold text-white">Vehicle and ECU</h2>
        <VehicleStep {...stepProps} previousVehicles={previousVehicles} onApplyVehicle={(fields) => setForm((current) => ({ ...current, ...fields }))} />
      </Card>

      <Card padding="lg" className="flex flex-col gap-6">
        <CheckboxField
          id="privacyConsent"
          checked={form.privacyConsent}
          onChange={(checked) => update('privacyConsent', checked)}
          error={errors.privacyConsent}
        >
          I agree that ZEROONEMOD may process the submitted data and files to review and carry out this request, as described in the{' '}
          <Link to="/privacy-policy" className="text-white underline underline-offset-4 hover:text-neutral-300">
            Privacy Policy
          </Link>
          . <span className="text-neutral-500">Required.</span>
        </CheckboxField>
        {submitError && <Alert>{submitError}</Alert>}
        <Button type="submit" size="lg" disabled={submitting} className="w-full sm:w-auto sm:self-end">
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              {progress ?? 'Sending file'}
            </>
          ) : (
            'Submit file'
          )}
        </Button>
      </Card>
    </form>
  );
}
