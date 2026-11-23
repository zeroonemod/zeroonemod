import { useEffect, useRef, useState, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { StepProgress } from '@/components/ui/Stepper';
import { ApiError, errorMessage } from '@/lib/api';
import { useAuth } from '@/features/auth/useAuth';
import { isProfileComplete, profileToForm } from '@/features/submission/accountDetails';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import { submitGuest, submitJob, type SubmitResult } from '@/features/submission/submitJob';
import { GuestConfirmation } from '@/features/submission/GuestConfirmation';
import { GuestContactStep } from '@/features/submission/steps/GuestContactStep';
import { usePreviousVehicles } from '@/features/submission/usePreviousVehicles';
import { validateAllSteps, validateStep, type SubmitMode } from '@/features/submission/validation';
import { ConfirmationCard } from '@/features/submission/ConfirmationCard';
import { YourFileStep } from '@/features/submission/steps/YourFileStep';
import { VehicleStep } from '@/features/submission/steps/VehicleStep';
import { AboutStep } from '@/features/submission/steps/AboutStep';
import { GUEST_WIZARD_STEPS, INITIAL_FORM, WIZARD_STEPS, type FormErrors, type StepProps, type WizardForm } from '@/features/submission/types';

const LAST_STEP = WIZARD_STEPS.length - 1;

const STEP_TITLES = [
  { title: 'Your file', description: 'Choose the control unit, attach your original file and tell us what you need.' },
  { title: 'Vehicle and ECU', description: 'These details help us check file compatibility.' },
  { title: 'About you and confirm', description: 'Check your summary, then confirm to send the file for review.' },
];

const GUEST_STEP_3 = { title: 'Contact and confirm', description: 'Leave an email or a phone number so we can contact you, then send your file.' };

/**
 * The 3-step submission form. Customers, partners and guests fill in the same steps 1 and 2.
 * Step 3: guests leave an email and/or phone (no account); everyone else gives their details,
 * or only confirms when they are signed in with a complete profile.
 */
export function SubmitWizard({ guest = false }: { guest?: boolean }) {
  const { files, photos, clearFiles } = useSubmissionFiles();
  const { user, profile } = useAuth();
  const signedIn = Boolean(user && profile) && !guest;
  const stepLabels = guest ? GUEST_WIZARD_STEPS : WIZARD_STEPS;
  const mode: SubmitMode = guest ? 'guest' : signedIn ? 'signed_in' : 'new_account';
  const [reference, setReference] = useState<string | null>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progress, setProgress] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const previousVehicles = usePreviousVehicles(signedIn);

  // Signed-in customers: prefill step 3 from their profile, never overwriting what they typed.
  const accountFields = signedIn && user && profile ? profileToForm(user.email ?? '', profile) : null;
  const accountComplete = accountFields ? isProfileComplete(accountFields) : false;
  useEffect(() => {
    if (!accountFields) return;
    setForm((current) => {
      const next = { ...current };
      for (const [key, value] of Object.entries(accountFields) as [keyof typeof accountFields, string][]) {
        if (!next[key] && value) (next as Record<string, unknown>)[key] = value;
      }
      return next;
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.id]);

  const effectiveForm: WizardForm = accountFields
    ? { ...form, ...(accountComplete ? accountFields : {}), email: accountFields.email, password: '', passwordConfirm: '' }
    : form;

  const update: StepProps['update'] = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      const clearsContact = (key === 'email' || key === 'phone') && 'contact' in current;
      if (!(key in current) && !clearsContact) return current;
      const next = { ...current };
      delete next[key];
      if (clearsContact) delete next.contact;
      return next;
    });
  };

  const applyVehicle = (fields: Partial<WizardForm>) => {
    setForm((current) => ({ ...current, ...fields }));
    setErrors({});
  };

  const goToStep = (target: number) => {
    setStep(target);
    setErrors({});
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      // The guest "email or phone" message is not tied to one field, so fall back to the email field.
      (formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]') ?? formRef.current?.querySelector<HTMLElement>('#email'))?.focus();
    });
  };

  const handleNext = () => {
    const stepErrors = validateStep(step, effectiveForm, files.length > 0, mode);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError();
      return;
    }
    goToStep(step + 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== LAST_STEP || isSubmitting) return;

    const allErrors = validateAllSteps(effectiveForm, files.length > 0, mode);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      const firstStep = [0, 1, 2].find((index) => Object.keys(validateStep(index, effectiveForm, files.length > 0, mode)).length > 0) ?? step;
      if (firstStep !== step) setStep(firstStep);
      focusFirstError();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const onProgress = (done: number, total: number) =>
        setProgress(done < total ? `Uploading file ${done + 1} of ${total}` : guest ? 'Sending' : 'Creating your job');
      if (guest) {
        const ref = await submitGuest(effectiveForm, files, photos, onProgress);
        clearFiles();
        setReference(ref);
      } else {
        const submitted = await submitJob(effectiveForm, files, photos, onProgress);
        clearFiles();
        setResult(submitted);
      }
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (error) {
      setSubmitError(
        error instanceof ApiError
          ? error.message
          : errorMessage(error, 'We could not send your submission. Your details are still here, so please try again.'),
      );
    } finally {
      setIsSubmitting(false);
      setProgress(null);
    }
  };

  const resetWizard = () => {
    setForm(INITIAL_FORM);
    setStep(0);
    setErrors({});
    setResult(null);
  };

  if (reference) return <GuestConfirmation reference={reference} />;
  if (result) return <ConfirmationCard result={result} onSubmitAnother={resetWizard} />;

  const baseProps: StepProps = { form: effectiveForm, errors, update };
  const current = guest && step === 2 ? GUEST_STEP_3 : STEP_TITLES[step];

  return (
    <div className="flex flex-col gap-8">
      <StepProgress current={step} labels={stepLabels} ariaLabel="Submission progress" />

      <Card padding="lg">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold leading-[1.2] tracking-tight sm:text-3xl">{current.title}</h2>
            <p className="text-sm leading-[1.5] text-neutral-400">{current.description}</p>
          </div>

          {step === 0 && <YourFileStep {...baseProps} />}
          {step === 1 && <VehicleStep {...baseProps} previousVehicles={previousVehicles} onApplyVehicle={applyVehicle} />}
          {step === 2 &&
            (guest ? (
              <GuestContactStep {...baseProps} files={files} photos={photos} />
            ) : (
              <AboutStep {...baseProps} files={files} photos={photos} accountComplete={accountComplete} signedIn={signedIn} />
            ))}

          {submitError && <Alert>{submitError}</Alert>}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button variant="ghost" onClick={() => step > 0 && goToStep(step - 1)} disabled={step === 0 || isSubmitting} className="sm:min-w-28">
              <ArrowLeft className="h-4 w-4" aria-hidden="true" />
              Back
            </Button>

            {step < LAST_STEP ? (
              <Button variant="primary" onClick={handleNext} className="sm:min-w-40">
                Next
                <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </Button>
            ) : (
              <Button type="submit" variant="primary" disabled={isSubmitting} className="sm:min-w-52">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                    {progress ?? 'Sending file'}
                  </>
                ) : (
                  'Submit file'
                )}
              </Button>
            )}
          </div>
        </form>
      </Card>
    </div>
  );
}
