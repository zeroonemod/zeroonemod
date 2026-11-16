import { useSearchParams } from 'react-router-dom';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoadingState } from '@/components/ui/LoadingState';
import { useAuth } from '@/features/auth/useAuth';
import { GuestSubmitForm } from '@/features/submission/GuestSubmitForm';
import { SubmitChoice } from '@/features/submission/SubmitChoice';
import { SubmitWizard } from '@/features/submission/SubmitWizard';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

export function SubmitPage() {
  useDocumentMeta({
    title: 'Submit a file | ZEROONEMOD',
    description: 'Submit your original ECU or TCU file with vehicle and control unit details for individual review.',
  });
  const { status } = useAuth();
  const [params, setParams] = useSearchParams();
  // Visitors choose guest or account first. Logged-in customers go straight to the wizard.
  const mode = status === 'signed_in' ? 'account' : params.get('as');
  const choose = (next: 'guest' | 'account' | null) => {
    setParams(next ? { as: next } : {});
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <PageLayout>
      <section className="mx-auto max-w-3xl px-5 py-16 sm:px-8 sm:py-24">
        <div className="mb-10 flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Submit a file</p>
          <h1 className="text-3xl font-bold leading-[1.2] tracking-tight sm:text-4xl">Submit your ECU or TCU file</h1>
        </div>
        {status === 'loading' ? (
          <LoadingState />
        ) : mode === 'account' ? (
          <SubmitWizard />
        ) : mode === 'guest' ? (
          <GuestSubmitForm onBack={() => choose(null)} />
        ) : (
          <SubmitChoice onGuest={() => choose('guest')} onAccount={() => choose('account')} />
        )}
      </section>
    </PageLayout>
  );
}
