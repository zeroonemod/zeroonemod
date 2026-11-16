import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/Button';

const STORAGE_KEY = 'zom-cookie-consent';
const OPEN_EVENT = 'zom:cookie-settings';

export type CookieConsent = 'necessary' | 'all';

function readConsent(): CookieConsent | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY);
    return value === 'necessary' || value === 'all' ? value : null;
  } catch {
    return null;
  }
}

/** Current consent choice. Optional analytics must check this before loading. */
export function getCookieConsent(): CookieConsent | null {
  return typeof window === 'undefined' ? null : readConsent();
}

/** Reopens the banner so a visitor can change or withdraw their choice. */
export function openCookieSettings() {
  window.dispatchEvent(new Event(OPEN_EVENT));
}

export function CookieBanner() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    setOpen(readConsent() === null);
    const reopen = () => setOpen(true);
    window.addEventListener(OPEN_EVENT, reopen);
    return () => window.removeEventListener(OPEN_EVENT, reopen);
  }, []);

  const choose = (value: CookieConsent) => {
    try {
      window.localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Storage blocked: the banner simply closes for this visit.
    }
    setOpen(false);
  };

  if (!open) return null;

  return (
    <div role="region" aria-label="Cookie consent" className="fixed inset-x-0 bottom-0 z-50 p-4 sm:p-6">
      <div className="mx-auto flex max-w-3xl flex-col gap-4 rounded-2xl border border-white/[0.08] bg-surface-raised p-5 shadow-2xl sm:flex-row sm:items-center sm:gap-6 sm:p-6">
        <p className="text-sm leading-[1.5] text-neutral-300">
          We use only strictly necessary storage to keep you signed in and remember your progress in forms. We do not
          use advertising or tracking cookies. See our{' '}
          <Link to="/cookie-policy" className="text-white underline underline-offset-4 hover:text-neutral-300">
            Cookie Policy
          </Link>
          .
        </p>
        <div className="flex shrink-0 flex-col gap-2 sm:flex-row">
          <Button variant="secondary" size="sm" onClick={() => choose('necessary')}>
            Necessary only
          </Button>
          <Button size="sm" onClick={() => choose('all')}>
            Accept
          </Button>
        </div>
      </div>
    </div>
  );
}
