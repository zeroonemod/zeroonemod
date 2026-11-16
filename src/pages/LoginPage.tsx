import { Link, Navigate, useLocation } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { PageLayout } from '@/components/layout/PageLayout';
import { LoginForm } from '@/features/auth/LoginForm';
import { useAuth } from '@/features/auth/useAuth';
import { homeForRole } from '@/features/auth/roles';
import { LoadingState } from '@/components/ui/LoadingState';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

export function LoginPage() {
  useDocumentMeta({ title: 'Log in | ZEROONEMOD', description: 'Log in to your ZEROONEMOD account to track jobs and files.', noindex: true });
  const { status, profile } = useAuth();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from;

  if (status === 'loading') {
    return (
      <PageLayout>
        <LoadingState label="Checking your session" />
      </PageLayout>
    );
  }

  if (status === 'signed_in' && profile) {
    return <Navigate to={from && from !== '/login' ? from : homeForRole(profile.role)} replace />;
  }

  return (
    <PageLayout>
      <div className="mx-auto flex max-w-md flex-col gap-8 px-5 py-16 sm:py-24">
        <header className="flex flex-col gap-3 text-center">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Account</p>
          <h1 className="text-3xl font-bold leading-[1.2] tracking-tight">Log in</h1>
        </header>

        <Card padding="lg">
          <LoginForm />
        </Card>

        <p className="text-center text-sm leading-[1.5] text-neutral-400">
          Workshop or business?{' '}
          <Link to="/b2b-partnerships" className="text-white underline underline-offset-4 hover:text-neutral-300">
            Request partner access
          </Link>
        </p>
      </div>
    </PageLayout>
  );
}
