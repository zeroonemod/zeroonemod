import { Cog, FileSearch, ShieldCheck, Wrench, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconBadge } from '@/components/ui/IconBadge';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface ReasonItem {
  icon: LucideIcon;
  title: string;
  description: string;
}

const REASONS: ReasonItem[] = [
  {
    icon: Cog,
    title: 'Engineering background',
    description: 'Our work is grounded in electronic engineering and a working understanding of automotive control systems.',
  },
  {
    icon: Wrench,
    title: 'Technical approach',
    description: 'Every file is checked for structure, compatibility and the requested change before any work begins.',
  },
  {
    icon: FileSearch,
    title: 'Individual file review',
    description: 'No batch processing. Each submitted file is reviewed by hand for your specific vehicle and unit.',
  },
  {
    icon: ShieldCheck,
    title: 'Quality control',
    description: 'Completed files are technically reviewed before they are released to you.',
  },
];

export function WhySection() {
  return (
    <section className="border-t border-white/[0.06] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 sm:px-8">
        <SectionHeading
          eyebrow="Why ZEROONEMOD"
          title="Careful engineering, clear communication"
          description="An independent service built around accuracy, file quality and personal support."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {REASONS.map((reason) => (
            <li key={reason.title}>
              <Card className="group flex h-full flex-col gap-4">
                <IconBadge>
                  <reason.icon className="h-5 w-5" aria-hidden="true" />
                </IconBadge>
                <h3 className="text-base font-semibold text-white">{reason.title}</h3>
                <p className="text-sm leading-[1.5] text-neutral-400">{reason.description}</p>
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
