import { Link } from 'react-router-dom';
import { ArrowRight, Cpu, Gauge, Zap, type LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconBadge } from '@/components/ui/IconBadge';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  to?: string;
}

const SERVICES: ServiceItem[] = [
  {
    icon: Cpu,
    title: 'ECU File Services',
    description: 'Engine control file editing and decodings, reviewed individually against your vehicle and file.',
    to: '/ecu-services',
  },
  {
    icon: Gauge,
    title: 'TCU File Services',
    description: 'Gearbox control file calibration and supported transmission adjustments.',
    to: '/tcu-services',
  },
  {
    icon: Zap,
    title: 'Stage 1 Calibration',
    description: 'Manually developed calibrations, tailored to each vehicle and its specific requirements.',
  },
];

export function ServicesSection() {
  return (
    <section id="services" className="scroll-mt-24 border-t border-white/[0.06] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 sm:px-8">
        <SectionHeading
          eyebrow="Services"
          title="What we can help with"
          description="Availability depends on the control unit, the vehicle and the original file. We confirm every request after review."
        />
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {SERVICES.map((service) => (
            <li key={service.title}>
              <Card className="group flex h-full flex-col gap-4">
                <IconBadge>
                  <service.icon className="h-5 w-5" aria-hidden="true" />
                </IconBadge>
                <h3 className="text-lg font-semibold text-white">{service.title}</h3>
                <p className="text-sm leading-[1.5] text-neutral-400">{service.description}</p>
                {service.to && (
                  <Link
                    to={service.to}
                    className="mt-auto inline-flex items-center gap-1.5 pt-2 text-sm font-medium text-white transition-colors duration-200 hover:text-neutral-300"
                  >
                    Learn more
                    <ArrowRight className="h-4 w-4" aria-hidden="true" />
                  </Link>
                )}
              </Card>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
