import { useState, type FormEvent } from 'react';
import { AnimatedCheck } from '@/components/ui/AnimatedCheck';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { CheckboxField, TextArea, TextInput } from '@/components/ui/FormField';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { describeRequestError, isValidEmail, submitRequest } from '@/lib/requestForms';

interface PartnerValues {
  companyName: string;
  contactName: string;
  email: string;
  phone: string;
  country: string;
  message: string;
  website: string;
}

type PartnerErrors = Partial<Record<keyof PartnerValues | 'consent', string>>;

const EMPTY_VALUES: PartnerValues = {
  companyName: '',
  contactName: '',
  email: '',
  phone: '',
  country: '',
  message: '',
  website: '',
};

function validate(values: PartnerValues, consent: boolean): PartnerErrors {
  const errors: PartnerErrors = {};
  if (!values.companyName.trim()) errors.companyName = 'Enter your company name.';
  if (!values.contactName.trim()) errors.contactName = 'Enter the contact person name.';
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.country.trim()) errors.country = 'Enter your country.';
  if (values.phone.trim() && !/^[+0-9 ()-]{6,30}$/.test(values.phone.trim())) {
    errors.phone = 'Enter a valid phone number.';
  }
  if (!consent) errors.consent = 'Please accept the privacy terms to send your request.';
  return errors;
}

export function PartnerRequestForm() {
  const [values, setValues] = useState<PartnerValues>(EMPTY_VALUES);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<PartnerErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const update = (key: keyof PartnerValues, value: string) => {
    setValues((current) => ({ ...current, [key]: value }));
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const nextErrors = validate(values, consent);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setStatus('sending');
    setServerError(null);
    try {
      await submitRequest('partner', {
        companyName: values.companyName.trim(),
        contactName: values.contactName.trim(),
        email: values.email.trim(),
        phone: values.phone.trim(),
        country: values.country.trim(),
        message: values.message.trim(),
        website: values.website,
        consent: true,
      });
      setStatus('sent');
    } catch (error) {
      setServerError(describeRequestError(error));
      setStatus('error');
    }
  };

  if (status === 'sent') {
    return (
      <div className="flex flex-col items-start gap-5">
        <AnimatedCheck size="md" />
        <h3 className="text-xl font-bold leading-[1.2]">Request received</h3>
        <p className="text-sm leading-[1.5] text-neutral-400">
          Thank you. Our team reviews every partner request and will contact you. Submitting this form does not create
          partner access. Accounts are approved by ZEROONEMOD only.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 sm:grid-cols-2">
        <TextInput
          id="partner-company"
          label="Company name"
          autoComplete="organization"
          maxLength={120}
          value={values.companyName}
          onChange={(event) => update('companyName', event.target.value)}
          error={errors.companyName}
        />
        <TextInput
          id="partner-contact"
          label="Contact name"
          autoComplete="name"
          maxLength={120}
          value={values.contactName}
          onChange={(event) => update('contactName', event.target.value)}
          error={errors.contactName}
        />
        <TextInput
          id="partner-email"
          label="Email"
          type="email"
          inputMode="email"
          autoComplete="email"
          maxLength={254}
          value={values.email}
          onChange={(event) => update('email', event.target.value)}
          error={errors.email}
        />
        <TextInput
          id="partner-phone"
          label="Phone"
          type="tel"
          inputMode="tel"
          autoComplete="tel"
          optional
          maxLength={30}
          value={values.phone}
          onChange={(event) => update('phone', event.target.value)}
          error={errors.phone}
        />
        <div className="sm:col-span-2 sm:max-w-sm">
          <TextInput
            id="partner-country"
            label="Country"
            autoComplete="country-name"
            maxLength={80}
            value={values.country}
            onChange={(event) => update('country', event.target.value)}
            error={errors.country}
          />
        </div>
      </div>
      <TextArea
        id="partner-message"
        label="Message"
        optional
        maxLength={2000}
        hint="Tell us about your workshop or business and the services you need."
        value={values.message}
        onChange={(event) => update('message', event.target.value)}
        error={errors.message}
      />

      <HoneypotField value={values.website} onChange={(value) => update('website', value)} />

      <CheckboxField id="partner-consent" checked={consent} onChange={setConsent} error={errors.consent}>
        I agree that ZEROONEMOD may process the details I provide to review this partner request, as described in the{' '}
        <a href="/privacy-policy" className="text-white underline underline-offset-4 hover:text-neutral-300">
          Privacy Policy
        </a>
        .
      </CheckboxField>

      {serverError && <Alert>{serverError}</Alert>}

      <div className="flex justify-end">
        <Button type="submit" size="lg" disabled={status === 'sending'} className="w-full sm:w-auto">
          {status === 'sending' ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
              Sending
            </>
          ) : (
            'Request partner access'
          )}
        </Button>
      </div>
    </form>
  );
}
