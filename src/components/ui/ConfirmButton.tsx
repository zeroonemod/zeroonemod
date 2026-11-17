import { useState, type ReactNode } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';

type Variant = 'primary' | 'secondary' | 'ghost';
type Size = 'sm' | 'md' | 'lg';

interface ConfirmButtonProps {
  /** Content of the first button (icon and text). */
  children: ReactNode;
  /** Question shown before the action runs. */
  message: string;
  /** Text of the button that runs the action. */
  confirmLabel: string;
  onConfirm: () => void | Promise<void>;
  variant?: Variant;
  size?: Size;
  disabled?: boolean;
  busy?: boolean;
  className?: string;
}

/**
 * Two-step button for actions that matter (delete, deliver, mark as paid...). The first click shows
 * the question inline with Cancel and a confirm button. It replaces the browser's confirm() pop-up,
 * which some browsers block and which does not match the site design.
 */
export function ConfirmButton({
  children,
  message,
  confirmLabel,
  onConfirm,
  variant = 'secondary',
  size = 'sm',
  disabled = false,
  busy = false,
  className = '',
}: ConfirmButtonProps) {
  const [asking, setAsking] = useState(false);

  if (!asking) {
    return (
      <Button variant={variant} size={size} disabled={disabled || busy} onClick={() => setAsking(true)} className={className}>
        {busy && <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />}
        {children}
      </Button>
    );
  }

  return (
    <div role="group" aria-label="Confirm action" className={`flex w-full flex-col gap-3 rounded-lg border border-brand-500/40 bg-brand-500/[0.06] p-4 ${className}`}>
      <p className="whitespace-normal text-sm leading-[1.5] text-neutral-100">{message}</p>
      <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
        <Button variant="ghost" size="sm" onClick={() => setAsking(false)} autoFocus>
          Cancel
        </Button>
        <Button
          size="sm"
          onClick={async () => {
            setAsking(false);
            await onConfirm();
          }}
        >
          {confirmLabel}
        </Button>
      </div>
    </div>
  );
}
