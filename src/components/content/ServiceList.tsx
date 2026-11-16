import type { LucideIcon } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { IconBadge } from '@/components/ui/IconBadge';

export interface ServiceItem {
  icon: LucideIcon;
  title: string;
  description: string;
  items?: string[];
}

export function ServiceGrid({ services }: { services: ServiceItem[] }) {
  return (
    <div className="grid gap-5 sm:grid-cols-2">
      {services.map((service) => {
        const Icon = service.icon;
        return (
          <Card key={service.title} className="group flex h-full flex-col gap-4">
            <IconBadge>
              <Icon className="h-5 w-5" aria-hidden="true" />
            </IconBadge>
            <h2 className="text-lg font-semibold text-white">{service.title}</h2>
            <p className="text-sm leading-[1.5] text-neutral-400">{service.description}</p>
            {service.items && (
              <ul className="mt-auto flex flex-col gap-2 border-t border-white/[0.08] pt-4 text-sm text-neutral-300">
                {service.items.map((item) => (
                  <li key={item} className="flex gap-3">
                    <span className="mt-2 h-1 w-1 shrink-0 rounded-full bg-brand-500" aria-hidden="true" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        );
      })}
    </div>
  );
}
