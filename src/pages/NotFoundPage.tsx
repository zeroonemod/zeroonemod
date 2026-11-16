import { ButtonLink } from '@/components/ui/Button';
import { PageLayout } from '@/components/layout/PageLayout';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

export function NotFoundPage() {
  useDocumentMeta({ title: 'Page not found | ZEROONEMOD', description: 'This page does not exist.', noindex: true });

  return (
    <PageLayout>
      <section className="mx-auto flex min-h-[60vh] max-w-2xl flex-col items-center justify-center gap-6 px-5 py-24 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">404</p>
        <h1 className="text-3xl font-bold leading-[1.2] sm:text-4xl">Page not found</h1>
        <p className="text-base leading-[1.5] text-neutral-400">The page you are looking for does not exist or has moved.</p>
        <div className="flex flex-col gap-3 sm:flex-row">
          <ButtonLink to="/">Back to home</ButtonLink>
          <ButtonLink to="/submit" variant="secondary">
            Submit a file
          </ButtonLink>
        </div>
      </section>
    </PageLayout>
  );
}
