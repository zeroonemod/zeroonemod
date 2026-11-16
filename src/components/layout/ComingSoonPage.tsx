import { ButtonLink } from '@/components/ui/Button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

interface UnavailablePageProps {
  title: string;
  eyebrow?: string;
}

export function ComingSoonPage({ title, eyebrow = 'Not available yet' }: UnavailablePageProps) {
  useDocumentMeta({ title: `${title} | ZEROONEMOD`, description: `${title} at ZEROONEMOD.` });

  return (
    <PageLayout>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-5 py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">{eyebrow}</p>
        <h1 className="text-3xl font-bold leading-[1.2] sm:text-4xl">{title}</h1>
        <p className="text-base leading-[1.5] text-neutral-400">
          This page is not available yet. In the meantime you can submit your file directly.
        </p>
        <ButtonLink to="/submit">Submit a file</ButtonLink>
      </section>
    </PageLayout>
  );
}
