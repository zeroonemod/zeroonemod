import type { ReactNode } from 'react';
import { Info, type LucideIcon } from 'lucide-react';
import { PageLayout } from '@/components/layout/PageLayout';
import { ButtonLink } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconBadge } from '@/components/ui/IconBadge';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

interface ContentPageProps {
  label: string;
  title: string;
  intro?: string;
  description: string;
  children: ReactNode;
}

export function ContentPage({ label, title, intro, description, children }: ContentPageProps) {
  useDocumentMeta({ title: `${title} | ZEROONEMOD`, description });

  return (
    <PageLayout>
      <div className="mx-auto flex max-w-7xl flex-col gap-14 px-5 py-16 sm:px-8 sm:py-24">
        <header className="flex max-w-3xl flex-col gap-4">
          <p className="eyebrow">{label}</p>
          <h1 className="text-4xl font-bold leading-[1.2] tracking-tight sm:text-5xl">{title}</h1>
          {intro && <p className="text-base leading-[1.5] text-neutral-400 sm:text-lg">{intro}</p>}
        </header>
        {children}
      </div>
    </PageLayout>
  );
}

interface FeatureCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
}

export function FeatureCard({ icon: Icon, title, description }: FeatureCardProps) {
  return (
    <Card className="group flex h-full flex-col gap-4">
      <IconBadge>
        <Icon className="h-5 w-5" aria-hidden="true" />
      </IconBadge>
      <h2 className="text-lg font-semibold text-white">{title}</h2>
      <p className="text-sm leading-[1.5] text-neutral-400">{description}</p>
    </Card>
  );
}

export function NoticeCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex items-start gap-4 rounded-2xl border border-white/20 bg-surface-raised p-6 sm:p-8">
      <Info className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" aria-hidden="true" />
      <div className="flex flex-col gap-2">
        <p className="text-sm font-semibold text-white">Compatibility notice</p>
        <p className="text-sm leading-[1.5] text-neutral-400">{children}</p>
      </div>
    </div>
  );
}

export function SubmitCta() {
  return (
    <div className="flex justify-center">
      <ButtonLink to="/submit" size="lg" className="w-full sm:w-auto">
        Submit a file
      </ButtonLink>
    </div>
  );
}
