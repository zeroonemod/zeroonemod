import { Link } from 'react-router-dom';
import { CheckboxField, SelectInput, TextInput } from '@/components/ui/FormControls';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { ConfirmSummary } from '@/features/submission/ConfirmSummary';
import { CUSTOMER_TYPE_OPTIONS, type CustomerType, type StepProps } from '@/features/submission/types';

interface AboutStepProps extends StepProps {
  files: File[];
  accountComplete: boolean;
}

export function AboutStep({ form, errors, update, files, accountComplete }: AboutStepProps) {
  return (
    <div className="flex flex-col gap-8">
      {!accountComplete && (
        <div className="grid gap-6 sm:grid-cols-2">
          <HoneypotField value={form.website} onChange={(value) => update('website', value)} />

          <TextInput
            id="firstName"
            label="First name"
            autoComplete="given-name"
            value={form.firstName}
            onChange={(event) => update('firstName', event.target.value)}
            error={errors.firstName}
          />
          <TextInput
            id="lastName"
            label="Last name"
            autoComplete="family-name"
            value={form.lastName}
            onChange={(event) => update('lastName', event.target.value)}
            error={errors.lastName}
          />
          <TextInput
            id="email"
            label="Email"
            type="email"
            autoComplete="email"
            inputMode="email"
            value={form.email}
            onChange={(event) => update('email', event.target.value)}
            error={errors.email}
            hint="We send your order updates and reference here."
          />
          <TextInput
            id="country"
            label="Country"
            autoComplete="country-name"
            value={form.country}
            onChange={(event) => update('country', event.target.value)}
            error={errors.country}
          />
          <SelectInput
            id="customerType"
            label="Customer type"
            placeholder="Select customer type"
            options={CUSTOMER_TYPE_OPTIONS}
            value={form.customerType}
            onChange={(event) => update('customerType', event.target.value as CustomerType)}
            error={errors.customerType}
          />
          {form.customerType === 'workshop' ? (
            <TextInput
              id="companyName"
              label="Company name"
              autoComplete="organization"
              value={form.companyName}
              onChange={(event) => update('companyName', event.target.value)}
              error={errors.companyName}
            />
          ) : (
            <div className="hidden sm:block" aria-hidden="true" />
          )}
          <div className="sm:col-span-2 sm:max-w-sm">
            <TextInput
              id="phone"
              label="Phone"
              type="tel"
              optional
              autoComplete="tel"
              inputMode="tel"
              value={form.phone}
              onChange={(event) => update('phone', event.target.value)}
              error={errors.phone}
            />
          </div>
          <div className="sm:col-span-2">
            <TextInput
              id="password"
              label="Create a password to track your order"
              optional
              type="password"
              autoComplete="new-password"
              value={form.password}
              onChange={(event) => update('password', event.target.value)}
              error={errors.password}
              hint="Creates your customer account so you can log in to follow this order. Leave it empty and we will email you a sign-in link instead."
            />
          </div>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <p className="text-sm font-medium text-neutral-200">Summary</p>
        <ConfirmSummary form={form} files={files} />
      </div>

      <CheckboxField
        id="privacyConsent"
        checked={form.privacyConsent}
        onChange={(checked) => update('privacyConsent', checked)}
        error={errors.privacyConsent}
      >
        I agree that ZEROONEMOD may process my personal data and my submitted files to review and carry out this request, as described in the{' '}
        <Link to="/privacy-policy" className="text-white underline underline-offset-4 hover:text-neutral-300">
          Privacy Policy
        </Link>
        . <span className="text-neutral-500">Required.</span>
      </CheckboxField>
    </div>
  );
}
