import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { SectionHeading } from '@/components/ui/SectionHeading';

const STEPS = [
  { number: '01', title: 'Submit your original file', description: 'Share your vehicle and control unit details and upload the original file.' },
  { number: '02', title: 'Technical review', description: 'We check your information, file compatibility and the requested service.' },
  {
    number: '03',
    title: 'Payment',
    description: 'You receive a quotation and complete the payment before the modified file is released.',
  },
  { number: '04', title: 'File modification', description: 'The file is processed and technically reviewed by our engineers.' },
  { number: '05', title: 'Secure file delivery', description: 'Receive your completed file through a secure, time-limited download link.' },
];

export function HowItWorksSection() {
  return (
    <section className="border-t border-white/[0.06] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 sm:px-8">
        <SectionHeading
          eyebrow="How it works"
          title="From upload to delivery in five steps"
          description="Every submitted file is individually reviewed."
        />
        <ol className="relative flex flex-col gap-6 before:absolute before:bottom-[22px] before:left-[21px] before:top-[22px] before:w-px before:bg-brand-500/50 before:content-[''] lg:grid lg:grid-cols-5 lg:gap-5 lg:before:bottom-auto lg:before:left-[10%] lg:before:right-[10%] lg:before:top-[22px] lg:before:h-px lg:before:w-auto lg:before:bg-none lg:before:border-t lg:before:border-dashed lg:before:border-brand-500/60">
          {STEPS.map((step) => (
            <li key={step.number} className="relative flex items-start gap-5 lg:flex-col lg:items-center lg:text-center">
              <span className="relative z-10 flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-brand-500 bg-canvas font-mono text-sm font-bold text-brand-400">
                {step.number}
              </span>
              <Card className="flex h-full min-w-0 flex-1 flex-col gap-3 lg:w-full">
                <h3 className="text-base font-semibold text-white">{step.title}</h3>
                <p className="text-sm leading-[1.5] text-neutral-400">{step.description}</p>
              </Card>
            </li>
          ))}
        </ol>
        <div className="flex justify-center">
          <ButtonLink to="/how-it-works" variant="secondary">
            See the full process
          </ButtonLink>
        </div>
      </div>
    </section>
  );
}
