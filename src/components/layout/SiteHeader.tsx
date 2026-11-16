import { useState } from 'react';
import { Link, NavLink } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import { HEADER_LINKS } from '@/lib/navigation';
import { buttonClasses } from '@/components/ui/Button';
import { Wordmark } from '@/components/layout/Wordmark';

const desktopLinkClass = ({ isActive }: { isActive: boolean }) =>
  `relative py-2 text-xs font-medium uppercase tracking-[0.14em] transition-colors duration-200 hover:text-white after:absolute after:inset-x-0 after:-bottom-px after:h-px after:origin-left after:bg-brand-500 after:transition-transform after:duration-200 ${
    isActive ? 'text-white after:scale-x-100' : 'text-neutral-400 after:scale-x-0 hover:after:scale-x-100'
  }`;

const mobileLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex min-h-14 items-center border-b border-white/[0.08] text-sm font-medium uppercase tracking-[0.14em] transition-colors duration-200 hover:text-white ${
    isActive ? 'text-white' : 'text-neutral-300'
  }`;

export function SiteHeader() {
  const [menuOpen, setMenuOpen] = useState(false);
  const closeMenu = () => setMenuOpen(false);

  return (
    <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-canvas backdrop-blur-md lg:bg-canvas/90">
      <div className="mx-auto grid h-16 max-w-7xl grid-cols-[1fr_auto_1fr] items-center gap-3 px-4 sm:px-8">
        <div className="hidden items-center justify-start lg:flex">
          <nav aria-label="Primary">
            <ul className="flex items-center gap-8">
              {HEADER_LINKS.map((link) => (
                <li key={link.to}>
                  <NavLink to={link.to} className={desktopLinkClass}>
                    {link.label}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>
        </div>

        <Link to="/" aria-label="ZEROONEMOD home" className="col-start-2 justify-self-center rounded-sm">
          <Wordmark />
        </Link>

        <div className="col-start-3 flex items-center justify-end gap-5">
          <Link
            to="/login"
            className="hidden text-xs font-medium uppercase tracking-[0.14em] text-neutral-400 transition-colors duration-200 hover:text-white lg:inline-block"
          >
            Partner Login
          </Link>
          <Link to="/submit" className={buttonClasses('primary', 'sm', 'hidden whitespace-nowrap lg:inline-flex')}>
            Submit a file
          </Link>
          <button
            type="button"
            onClick={() => setMenuOpen((open) => !open)}
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white transition-colors duration-200 hover:bg-white/5 lg:hidden"
          >
            {menuOpen ? <X className="h-5 w-5" aria-hidden="true" /> : <Menu className="h-5 w-5" aria-hidden="true" />}
          </button>
        </div>
      </div>

      {menuOpen && (
        <nav id="mobile-menu" aria-label="Mobile" className="border-t border-white/[0.08] bg-canvas shadow-2xl lg:hidden">
          <ul className="mx-auto flex max-w-7xl flex-col px-4">
            {HEADER_LINKS.map((link) => (
              <li key={link.to}>
                <NavLink to={link.to} onClick={closeMenu} className={mobileLinkClass}>
                  {link.label}
                </NavLink>
              </li>
            ))}
            <li>
              <NavLink to="/login" onClick={closeMenu} className={mobileLinkClass}>
                Partner Login
              </NavLink>
            </li>
            <li className="py-4">
              <Link to="/submit" onClick={closeMenu} className={buttonClasses('primary', 'lg', 'w-full')}>
                Submit a file
              </Link>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
