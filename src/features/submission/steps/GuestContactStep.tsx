import { Link } from 'react-router-dom';
import { CheckboxField, TextInput } from '@/components/ui/FormField';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { ConfirmSummary } from '@/features/submission/ConfirmSummary';
import type { StepProps } from '@/features/submission/types';

interface GuestContactStepProps extends StepProps {
  files: File[];
  photos: File[];
}

/** Step 3 for guests: an email and/or a phone number, the summary and consent. No account, no name. */
export function GuestContactStep({ form, errors, update, files, photos }: GuestContactStepProps) {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid gap-6 sm:grid-cols-2">
        <HoneypotField value={form.website} onChange={(value) => update('website', value)} />
        <TextInput
          id="email"
          label="Email"
          optional
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={form.email}
          onChange={(event) => update('email', event.target.value)}
          error={errors.email}
        />
        <TextInput
          id="phone"
          label="Phone number"
          optional
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          maxLength={30}
          placeholder="+34 600 000 000"
          value={form.phone}
          onChange={(event) => update('phone', event.target.value)}
          error={errors.phone}
        />
        {errors.contact && (
          <p role="alert" className="-mt-3 text-sm text-red-400 sm:col-span-2">
            {errors.contact}
          </p>
        )}
        <p className="-mt-2 text-xs leading-relaxed text-neutral-400 sm:col-span-2">
          As a guest you will be contacted directly by our team. Leave at least one of the two.
        </p>
      </div>

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-neutral-200">Summary</p>
        <ConfirmSummary form={form} files={files} photos={photos} guest />
      </div>

      <CheckboxField
        id="privacyConsent"
        checked={form.privacyConsent}
        onChange={(checked) => update('privacyConsent', checked)}
        error={errors.privacyConsent}
      >
        I agree that ZEROONEMOD may process my contact details and my submitted files to handle this request, as described in the{' '}
        <Link to="/privacy-policy" className="text-white underline underline-offset-4 hover:text-neutral-300">
          Privacy Policy
        </Link>
        . <span className="text-neutral-500">Required.</span>
      </CheckboxField>
    </div>
  );
}
