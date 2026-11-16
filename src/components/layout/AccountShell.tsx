import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/layout/Wordmark';
import { useAuth } from '@/features/auth/useAuth';
import { useMessageThreads } from '@/features/jobs/useMessageThreads';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

interface AccountShellProps {
  title: string;
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'My Jobs', end: true },
  { to: '/dashboard/messages', label: 'Messages', end: false },
  { to: '/dashboard/profile', label: 'Profile', end: false },
];

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${
    isActive ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 items-center gap-2 border-b border-white/[0.08] text-base transition-colors duration-200 ${
    isActive ? 'text-white' : 'text-neutral-400 hover:text-white'
  }`;

function UnreadDot({ count }: { count: number }) {
  if (count === 0) return null;
  return (
    <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-brand-500 px-1.5 text-[11px] font-semibold text-white">
      <span className="sr-only">Unread messages: </span>
      {count}
    </span>
  );
}

/** Customer and partner area: logo, My Jobs, Messages, Profile, Log out. */
export function AccountShell({ title, children }: AccountShellProps) {
  useDocumentMeta({ title: `${title} | ZEROONEMOD`, description: 'Your ZEROONEMOD account.', noindex: true });
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const { unreadTotal } = useMessageThreads('customer');

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas text-white">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-white focus:px-4 focus:py-2 focus:text-canvas"
      >
        Skip to content
      </a>
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-canvas/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
          <div className="hidden md:block" aria-hidden="true" />
          <Link to="/" aria-label="ZEROONEMOD home" className="col-start-2 justify-self-center">
            <Wordmark />
          </Link>
          <nav aria-label="Account" className="hidden items-center justify-self-end gap-1 md:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={desktopLinkClass}>
                {item.label}
                {item.to === '/dashboard/messages' && <UnreadDot count={unreadTotal} />}
              </NavLink>
            ))}
            <button
              type="button"
              onClick={handleLogout}
              className="ml-1 flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-neutral-400 transition-colors duration-200 hover:text-white"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
              Log out
            </button>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="account-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="relative col-start-3 inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-lg border border-white/15 text-white transition-colors duration-200 hover:bg-white/5 md:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
            {!menuOpen && unreadTotal > 0 && <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="account-menu" aria-label="Account" className="border-t border-white/[0.08] bg-canvas md:hidden">
            <ul className="flex flex-col px-4">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={mobileLinkClass}>
                    {item.label}
                    {item.to === '/dashboard/messages' && <UnreadDot count={unreadTotal} />}
                  </NavLink>
                </li>
              ))}
              <li>
                <button
                  type="button"
                  onClick={handleLogout}
                  className="flex min-h-12 w-full items-center gap-3 text-left text-base text-neutral-400 transition-colors duration-200 hover:text-white"
                >
                  <LogOut className="h-4 w-4" aria-hidden="true" />
                  Log out
                </button>
              </li>
            </ul>
          </nav>
        )}
      </header>
      <main id="main" className="mx-auto max-w-7xl px-4 py-8 sm:px-8 sm:py-14">
        {children}
      </main>
    </div>
  );
}
