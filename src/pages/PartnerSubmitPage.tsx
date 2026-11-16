import { Navigate } from 'react-router-dom';
import { AccountShell } from '@/components/layout/AccountShell';
import { useAuth } from '@/features/auth/useAuth';
import { PartnerQuickSubmit } from '@/features/submission/PartnerQuickSubmit';

export function PartnerSubmitPage() {
  const { profile } = useAuth();
  if (profile?.role !== 'partner') return <Navigate to="/submit" replace />;

  return (
    <AccountShell title="Submit a file">
      <div className="mx-auto flex max-w-3xl flex-col gap-8">
        <header className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-brand-400">Partner submission</p>
          <h1 className="text-3xl font-semibold leading-[1.2] text-white sm:text-4xl">Submit a file</h1>
        </header>
        <PartnerQuickSubmit />
      </div>
    </AccountShell>
  );
}
