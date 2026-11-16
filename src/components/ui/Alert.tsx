import type { ReactNode } from 'react';
import { CheckCircle2 } from 'lucide-react';

type Tone = 'error' | 'info' | 'success';

const TONES: Record<Tone, string> = {
  error: 'border-red-500/40 bg-red-500/10 text-red-300',
  info: 'border-white/15 bg-white/[0.03] text-neutral-200',
  success: 'border-white/15 bg-white/[0.03] text-neutral-100',
};

/** Boxed message used for form errors and notices. */
export function Alert({ tone = 'error', children, className = '' }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <p role={tone === 'error' ? 'alert' : 'status'} className={`rounded-lg border px-4 py-3 text-sm ${TONES[tone]} ${className}`}>
      {children}
    </p>
  );
}

export type Notice = { tone: 'success' | 'error'; text: string } | null;

/** Inline one-line notice next to a save button. */
export function NoticeLine({ notice }: { notice: Notice }) {
  if (!notice) return null;
  return (
    <p
      role={notice.tone === 'error' ? 'alert' : 'status'}
      className={`flex items-center gap-2 text-sm ${notice.tone === 'error' ? 'text-red-400' : 'text-emerald-400'}`}
    >
      {notice.tone === 'success' && <CheckCircle2 className="h-4 w-4 shrink-0" aria-hidden="true" />}
      {notice.text}
    </p>
  );
}
