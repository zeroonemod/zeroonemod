import { PageLayout } from '@/components/layout/PageLayout';
import { SubmitWizard } from '@/features/submission/SubmitWizard';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

export function SubmitPage() {
  useDocumentMeta({
    title: 'Submit a file | ZEROONEMOD',
    description: 'Submit your original ECU or TCU file with vehicle and control unit details for individual review.',
  });

  return (
    <PageLayout>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Submit a file</p>
          <h1 className="text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">Submit your ECU or TCU file</h1>
        </div>
        <SubmitWizard />
      </section>
    </PageLayout>
  );
}
