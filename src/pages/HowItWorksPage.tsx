import { ContentPage, SubmitCta } from '@/components/content/ContentPage';
import { Card } from '@/components/ui/Card';

const STEPS = [
  {
    number: '01',
    title: 'Submit',
    description:
      'Upload your original ECU or TCU file and tell us about your vehicle, control unit and the service you need.',
  },
  {
    number: '02',
    title: 'Review',
    description:
      'We check the file, identify the control unit and confirm what can be done. You receive a clear answer before anything is paid.',
  },
  {
    number: '03',
    title: 'Payment',
    description:
      'Once you approve the proposed work, you pay for the confirmed service. No work starts without your agreement.',
  },
  {
    number: '04',
    title: 'Modification',
    description:
      'Your file is modified by our engineers and checked against the original, so changes are limited to the agreed scope.',
  },
  {
    number: '05',
    title: 'Delivery',
    description:
      'The finished file is returned to you with a summary of what changed. Your original file stays stored for restoration.',
  },
];

export function HowItWorksPage() {
  return (
    <ContentPage
      label="Process"
      title="How It Works"
      intro="A simple, five-step process from your first upload to the finished file. You know what will be done before you pay, and you receive a clear record of every change."
      description="How ZEROONEMOD remote ECU and TCU file services work: submit, review, payment, modification and delivery."
    >
      <ol className="grid gap-5 lg:grid-cols-5">
        {STEPS.map((step) => (
          <li key={step.number} className="flex">
            <Card className="flex w-full flex-col gap-4">
              <span className="text-sm font-semibold tracking-[0.2em] text-brand-500">{step.number}</span>
              <h2 className="text-lg font-semibold text-white">{step.title}</h2>
              <p className="text-sm leading-[1.5] text-neutral-400">{step.description}</p>
            </Card>
          </li>
        ))}
      </ol>

      <div className="rounded-2xl border border-white/20 bg-surface-raised p-8 sm:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Our standard</p>
        <p className="mt-3 text-xl font-semibold leading-[1.2] text-white sm:text-2xl">
          Every submitted file is individually reviewed.
        </p>
      </div>

      <SubmitCta />
    </ContentPage>
  );
}
