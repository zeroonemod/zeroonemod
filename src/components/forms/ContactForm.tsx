import { useState, type FormEvent } from 'react';
import { AnimatedCheck } from '@/components/ui/AnimatedCheck';
import { Loader2 } from 'lucide-react';
import { Alert } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { CheckboxField, TextArea, TextInput } from '@/components/ui/FormField';
import { HoneypotField } from '@/components/ui/HoneypotField';
import { describeRequestError, isValidEmail, submitRequest } from '@/lib/requestForms';

interface ContactValues {
  name: string;
  email: string;
  subject: string;
  message: string;
  website: string;
}

type ContactErrors = Partial<Record<keyof ContactValues | 'consent', string>>;

const EMPTY_VALUES: ContactValues = { name: '', email: '', subject: '', message: '', website: '' };

function validate(values: ContactValues, consent: boolean): ContactErrors {
  const errors: ContactErrors = {};
  if (!values.name.trim()) errors.name = 'Enter your name.';
  if (!isValidEmail(values.email)) errors.email = 'Enter a valid email address.';
  if (!values.subject.trim()) errors.subject = 'Enter a subject.';
  if (!values.message.trim()) errors.message = 'Write your message.';
  if (!consent) errors.consent = 'Please accept the privacy terms to send your message.';
  return errors;
}

export function ContactForm() {
  const [values, setValues] = useState<ContactValues>(EMPTY_VALUES);
  const [consent, setConsent] = useState(false);
  const [errors, setErrors] = useState<ContactErrors>({});
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle');
  const [serverError, setServerError] = useState<string | null>(null);

  const update = (key: keyof ContactValues, value: string) => {
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
      await submitRequest('contact', {
        name: values.name.trim(),
        email: values.email.trim(),
        subject: values.subject.trim(),
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
      <Card padding="lg" className="flex flex-col items-start gap-5">
        <AnimatedCheck size="md" />
        <h2 className="text-2xl font-bold leading-[1.2]">Thank you, your message has been sent</h2>
        <p className="text-sm leading-[1.5] text-neutral-400">
          We have received your message and will reply by email. For a file quotation, please use Submit a file so we
          receive your vehicle and control unit details.
        </p>
      </Card>
    );
  }

  return (
    <Card padding="lg">
      <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
        <div className="grid gap-6 sm:grid-cols-2">
          <TextInput
            id="contact-name"
            label="Name"
            autoComplete="name"
            maxLength={120}
            value={values.name}
            onChange={(event) => update('name', event.target.value)}
            error={errors.name}
          />
          <TextInput
            id="contact-email"
            label="Email"
            type="email"
            inputMode="email"
            autoComplete="email"
            maxLength={254}
            value={values.email}
            onChange={(event) => update('email', event.target.value)}
            error={errors.email}
          />
        </div>
        <TextInput
          id="contact-subject"
          label="Subject"
          maxLength={150}
          value={values.subject}
          onChange={(event) => update('subject', event.target.value)}
          error={errors.subject}
        />
        <TextArea
          id="contact-message"
          label="Message"
          maxLength={2000}
          value={values.message}
          onChange={(event) => update('message', event.target.value)}
          error={errors.message}
        />

        <HoneypotField value={values.website} onChange={(value) => update('website', value)} />

        <CheckboxField id="contact-consent" checked={consent} onChange={setConsent} error={errors.consent}>
          I agree that ZEROONEMOD may process the details I provide to answer my message, as described in the{' '}
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
              'Send message'
            )}
          </Button>
        </div>
      </form>
    </Card>
  );
}
