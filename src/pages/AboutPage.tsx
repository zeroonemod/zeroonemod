import { Cpu, Gauge, ShieldCheck, Headset } from 'lucide-react';
import { ContentPage, FeatureCard, SubmitCta } from '@/components/content/ContentPage';

const PILLARS = [
  {
    icon: Cpu,
    title: 'Electronic engineering background',
    description:
      'ZEROONEMOD is built on a formal electronic engineering background, applied to the control units that run modern engines and transmissions.',
  },
  {
    icon: Gauge,
    title: 'Understanding of automotive control systems',
    description:
      'We work with how ECU and TCU software is structured, so each file is handled with the context it needs rather than as a generic template.',
  },
  {
    icon: ShieldCheck,
    title: 'Focus on accuracy and file quality',
    description:
      'Every file is checked for consistency with the original before it is returned, so the work you receive is clean, complete and ready to flash.',
  },
  {
    icon: Headset,
    title: 'Professional, personal support',
    description:
      'You deal directly with the people doing the work. Questions about your vehicle or your file are answered clearly, without call centres or scripts.',
  },
];

export function AboutPage() {
  return (
    <ContentPage
      label="About"
      title="About ZEROONEMOD"
      intro="ZEROONEMOD provides remote ECU and TCU file services for drivers, workshops and automotive professionals. We focus on careful engineering, clear communication and files that do exactly what they are meant to do."
      description="About ZEROONEMOD, a remote ECU and TCU file service run by an electronic engineering team focused on accuracy and file quality."
    >
      <section aria-labelledby="pillars-heading" className="flex flex-col gap-8">
        <h2 id="pillars-heading" className="text-2xl font-bold leading-[1.2] sm:text-3xl">
          How we work
        </h2>
        <div className="grid gap-5 sm:grid-cols-2">
          {PILLARS.map((pillar) => (
            <FeatureCard key={pillar.title} icon={pillar.icon} title={pillar.title} description={pillar.description} />
          ))}
        </div>
      </section>

      <section aria-labelledby="commitment-heading" className="max-w-3xl border-t border-white/[0.08] pt-14">
        <h2 id="commitment-heading" className="text-2xl font-bold leading-[1.2] sm:text-3xl">
          Our commitment
        </h2>
        <p className="mt-5 text-base leading-[1.5] text-neutral-400">
          We only take on work we can carry out properly. If a request is outside what we support, or a file cannot be
          modified safely, we will tell you before anything is changed. Your original file is always kept, and you
          remain responsible for how any modified file is used on your vehicle.
        </p>
      </section>

      <SubmitCta />
    </ContentPage>
  );
}
