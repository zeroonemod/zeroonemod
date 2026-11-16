import { useState, type ReactNode } from 'react';
import { Link, NavLink, useNavigate } from 'react-router-dom';
import { LogOut, Menu, X } from 'lucide-react';
import { Wordmark } from '@/components/layout/Wordmark';
import { useAuth } from '@/features/auth/useAuth';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

interface AccountShellProps {
  title: string;
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/dashboard', label: 'My Jobs', end: true },
  { to: '/dashboard/profile', label: 'Profile', end: false },
];

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded-lg px-3 py-2 text-sm transition-colors duration-200 ${isActive ? 'bg-white/10 text-white' : 'text-neutral-400 hover:text-white'}`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-12 items-center border-b border-white/[0.08] text-base transition-colors duration-200 ${isActive ? 'text-white' : 'text-neutral-400 hover:text-white'}`;

export function AccountShell({ title, children }: AccountShellProps) {
  useDocumentMeta({ title: `${title} | ZEROONEMOD`, description: 'Your ZEROONEMOD account.' });
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas text-white">
      <header className="sticky top-0 z-30 border-b border-white/[0.08] bg-canvas/95 backdrop-blur">
        <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 sm:px-8">
          <div className="hidden sm:block" aria-hidden="true" />
          <Link to="/" aria-label="ZEROONEMOD home" className="col-start-2 justify-self-center">
            <Wordmark />
          </Link>
          <nav aria-label="Account" className="hidden items-center justify-self-end gap-2 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.end} className={desktopLinkClass}>
                {item.label}
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
            className="col-start-3 inline-flex h-10 w-10 items-center justify-center justify-self-end rounded-lg border border-white/15 text-white transition-colors duration-200 hover:bg-white/5 sm:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>

        {menuOpen && (
          <nav id="account-menu" aria-label="Account" className="border-t border-white/[0.08] bg-canvas sm:hidden">
            <ul className="flex flex-col px-4">
              {NAV_ITEMS.map((item) => (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} onClick={() => setMenuOpen(false)} className={mobileLinkClass}>
                    {item.label}
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
