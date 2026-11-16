import { Briefcase } from 'lucide-react';
import { Card } from '@/components/ui/Card';
import { ButtonLink } from '@/components/ui/Button';
import { IconBadge } from '@/components/ui/IconBadge';

export function B2BSection() {
  return (
    <section className="border-t border-white/[0.06] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto max-w-7xl px-5 sm:px-8">
        <Card padding="lg" className="group flex flex-col items-start gap-8 md:flex-row md:items-center md:justify-between">
          <div className="flex max-w-2xl flex-col gap-4">
            <IconBadge>
              <Briefcase className="h-5 w-5" aria-hidden="true" />
            </IconBadge>
            <h2 className="text-2xl font-bold leading-[1.2] sm:text-3xl">Dedicated services for workshops and automotive professionals</h2>
            <p className="text-sm leading-[1.5] text-neutral-400 sm:text-base">
              Recurring customer relationships, direct communication and a private partner area with job history and
              file management. Partner access is set up by our team after review.
            </p>
          </div>
          <ButtonLink to="/b2b-partnerships" variant="secondary" size="lg" className="w-full md:w-auto">
            Become a partner
          </ButtonLink>
        </Card>
      </div>
    </section>
  );
}
