import { Check } from 'lucide-react';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';

/** Shown after a guest submission: no tracking, just the reference. */
export function GuestConfirmation({ reference }: { reference: string }) {
  return (
    <Card padding="lg" className="flex flex-col items-center gap-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full border border-white/15 bg-surface-raised">
        <Check className="h-6 w-6" aria-hidden="true" />
      </span>
      <h2 className="text-2xl font-bold leading-[1.2] sm:text-3xl">Thank you for submitting your file. We will contact you.</h2>
      <p className="text-sm text-neutral-400">
        Reference <span className="font-mono text-white">{reference}</span>
      </p>
      <ButtonLink to="/" variant="secondary">
        Back to home
      </ButtonLink>
    </Card>
  );
}
