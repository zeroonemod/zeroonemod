import { useRef, useState, type ComponentType, type FormEvent } from 'react';
import { ArrowLeft, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useAuth } from '@/features/auth/useAuth';
import { accountDetailsFor } from '@/features/submission/accountDetails';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import { submitJob, type SubmitResult } from '@/features/submission/submitJob';
import { validateAllSteps, validateStep } from '@/features/submission/validation';
import { WizardProgress } from '@/features/submission/WizardProgress';
import { ConfirmationCard } from '@/features/submission/ConfirmationCard';
import { YourFileStep } from '@/features/submission/steps/YourFileStep';
import { VehicleStep } from '@/features/submission/steps/VehicleStep';
import { AboutStep } from '@/features/submission/steps/AboutStep';
import {
  INITIAL_FORM,
  WIZARD_STEPS,
  type FormErrors,
  type StepProps,
  type WizardForm,
} from '@/features/submission/types';

const LAST_STEP = WIZARD_STEPS.length - 1;

const STEP_TITLES = [
  { title: 'Your file', description: 'Choose the control unit, attach your original file and tell us what you need.' },
  { title: 'Vehicle and ECU', description: 'These details help us check file compatibility.' },
  { title: 'About you and confirm', description: 'Check your summary, then confirm to send the file for review.' },
];

type WizardStepProps = StepProps & { files: File[]; accountComplete: boolean };

const STEP_COMPONENTS: ComponentType<WizardStepProps>[] = [YourFileStep, VehicleStep, AboutStep];

export function SubmitWizard() {
  const { files, clearFiles } = useSubmissionFiles();
  const { user, profile } = useAuth();
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<WizardForm>(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const formRef = useRef<HTMLFormElement>(null);

  const accountDetails = user && profile ? accountDetailsFor(user.email ?? '', profile) : null;
  const accountComplete = accountDetails !== null;
  const effectiveForm: WizardForm = accountDetails ? { ...form, ...accountDetails } : form;

  const update: StepProps['update'] = (key, value) => {
    setForm((current) => ({ ...current, [key]: value }));
    setErrors((current) => {
      if (!(key in current)) return current;
      const next = { ...current };
      delete next[key];
      return next;
    });
  };

  const goToStep = (target: number) => {
    setStep(target);
    setErrors({});
    setSubmitError(null);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const focusFirstError = () => {
    requestAnimationFrame(() => {
      formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus();
    });
  };

  const handleNext = () => {
    const stepErrors = validateStep(step, effectiveForm, files.length > 0);
    if (Object.keys(stepErrors).length > 0) {
      setErrors(stepErrors);
      focusFirstError();
      return;
    }
    goToStep(step + 1);
  };

  const handleBack = () => {
    if (step > 0) goToStep(step - 1);
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (step !== LAST_STEP || isSubmitting) return;

    const allErrors = validateAllSteps(effectiveForm, files.length > 0);
    if (Object.keys(allErrors).length > 0) {
      setErrors(allErrors);
      focusFirstError();
      return;
    }

    setIsSubmitting(true);
    setSubmitError(null);
    try {
      const submitted = await submitJob(effectiveForm, files);
      clearFiles();
      setResult(submitted);
    } catch {
      setSubmitError('We could not send your submission. Your details are still here, so please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const resetWizard = () => {
    setForm(INITIAL_FORM);
    setStep(0);
    setErrors({});
    setResult(null);
  };

  if (result) {
    return <ConfirmationCard result={result} onSubmitAnother={resetWizard} />;
  }

  const stepProps: WizardStepProps = { form: effectiveForm, errors, update, files, accountComplete };
  const StepComponent = STEP_COMPONENTS[step];
  const current = STEP_TITLES[step];

  return (
    <div className="flex flex-col gap-8">
      <WizardProgress current={step} total={WIZARD_STEPS.length} labels={WIZARD_STEPS} />

      <Card padding="lg">
        <form ref={formRef} onSubmit={handleSubmit} noValidate className="flex flex-col gap-8">
          <div className="flex flex-col gap-2">
            <h2 className="text-2xl font-bold leading-[1.2] tracking-tight sm:text-3xl">{current.title}</h2>
            <p className="text-sm leading-[1.5] text-neutral-400">{current.description}</p>
          </div>

          <StepComponent {...stepProps} />

          {submitError && (
            <p role="alert" className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-300">
              {submitError}
            </p>
          )}

          <div className="flex flex-col-reverse gap-3 border-t border-white/[0.08] pt-6 sm:flex-row sm:items-center sm:justify-between">
            <Button
              variant="ghost"
              onClick={handleBack}
              disabled={step === 0 || isSubmitting}
              className="sm:min-w-28"
            >
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
                    Sending file
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
