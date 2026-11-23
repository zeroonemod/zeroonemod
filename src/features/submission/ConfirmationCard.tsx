import { Link } from 'react-router-dom';
import { AnimatedCheck } from '@/components/ui/AnimatedCheck';
import { ButtonLink, Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import type { SubmitResult } from '@/features/submission/submitJob';
import { useAuth } from '@/features/auth/useAuth';

const ACCOUNT_MESSAGES: Record<SubmitResult['accountStatus'], string> = {
  signed_in: 'This job has been added to your account. You can follow it from My Jobs.',
  created: 'Your customer account is ready and you are signed in. You can follow this order from your account.',
  invited: 'We have emailed you a sign-in link. Use it to set up your account and follow this order.',
  exists: 'This job has been added to the existing account for this email. Log in to follow it.',
  unavailable: 'Your order is saved. We could not set up your tracking account, so please keep your reference number.',
};

interface ConfirmationCardProps {
  result: SubmitResult;
  onSubmitAnother: () => void;
}

export function ConfirmationCard({ result, onSubmitAnother }: ConfirmationCardProps) {
  const { status } = useAuth();
  const signedIn = status === 'signed_in';
  return (
    <Card padding="lg" className="flex flex-col items-center gap-6 text-center">
      <AnimatedCheck size="lg" />
      <div className="flex flex-col gap-3">
        <h2 className="text-2xl font-bold leading-[1.2] sm:text-3xl">Your file has been submitted</h2>
        <p className="text-sm leading-[1.5] text-neutral-400">
          Keep your job reference for all future messages. Every submission is reviewed individually.
        </p>
      </div>
      <div className="w-full rounded-xl border border-white/10 bg-surface-sunken px-6 py-6">
        <p className="text-xs font-medium uppercase tracking-[0.2em] text-neutral-400">Job reference</p>
        <p className="mt-2 font-mono text-2xl font-bold tracking-wider text-white sm:text-3xl">{result.reference}</p>
      </div>
      <p className="max-w-md text-sm leading-[1.5] text-neutral-300">{ACCOUNT_MESSAGES[result.accountStatus]}</p>
      <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
        {signedIn ? (
          <ButtonLink to={`/dashboard/jobs/${result.reference}`} variant="secondary">
            View this job
          </ButtonLink>
        ) : (
          <ButtonLink to="/" variant="secondary">
            Back to home
          </ButtonLink>
        )}
        <Button variant="ghost" onClick={onSubmitAnother}>
          Submit another file
        </Button>
      </div>
      {!signedIn && (
      <Link to="/login" className="text-xs text-neutral-500 underline underline-offset-4 hover:text-neutral-300">
        Already have an account? Log in
      </Link>
      )}
    </Card>
  );
}
