import { Link } from 'react-router-dom';
import { Paperclip } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';

interface SubmitChoiceProps {
  onGuest: () => void;
  onAccount: () => void;
}

/** Shown to visitors who are not logged in, before the wizard. The attached files are kept. */
export function SubmitChoice({ onGuest, onAccount }: SubmitChoiceProps) {
  const { files } = useSubmissionFiles();

  return (
    <Card padding="lg" className="flex flex-col gap-6">
      {files.length > 0 && (
        <p className="flex items-center gap-2 text-sm text-neutral-300">
          <Paperclip className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
          <span className="min-w-0 truncate">
            {files.length === 1 ? files[0].name : `${files.length} files`} attached
          </span>
        </p>
      )}

      <div className="flex flex-col gap-3 sm:flex-row">
        <Button size="lg" onClick={onGuest} className="w-full sm:flex-1">
          Continue as guest
        </Button>
        <Button size="lg" variant="secondary" onClick={onAccount} className="w-full sm:flex-1">
          Log in / Create account
        </Button>
      </div>

      <p className="text-sm leading-[1.5] text-neutral-400">Submit your file without creating an account. Our team will review your request and contact you with the next steps.</p>

      <p className="border-t border-white/[0.08] pt-5 text-xs text-neutral-500">
        Already have an account?{' '}
        <Link to="/login" state={{ from: '/submit' }} className="text-neutral-300 underline underline-offset-4 hover:text-white">
          Log in
        </Link>
      </p>
    </Card>
  );
}
