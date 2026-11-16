import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate } from 'react-router-dom';
import { Briefcase, HelpCircle, Handshake, LayoutDashboard, LogOut, Menu, MessageSquare, Settings, Users, X } from 'lucide-react';
import { Wordmark } from '@/components/layout/Wordmark';
import { useAuth } from '@/features/auth/useAuth';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard, end: true },
  { to: '/admin/jobs', label: 'Jobs', icon: Briefcase, end: false },
  { to: '/admin/customers', label: 'Customers', icon: Users, end: false },
  { to: '/admin/partners', label: 'Partners', icon: Handshake, end: false },
  { to: '/admin/messages', label: 'Messages', icon: MessageSquare, end: false },
  { to: '/admin/faq', label: 'FAQ', icon: HelpCircle, end: false },
  { to: '/admin/settings', label: 'Settings', icon: Settings, end: false },
];

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `flex items-center gap-3 rounded-lg border-l-2 px-3 py-2.5 text-sm transition-colors duration-200 ${
    isActive ? 'border-brand-500 bg-brand-500/[0.08] text-white' : 'border-transparent text-neutral-400 hover:bg-white/[0.04] hover:text-white'
  }`;

export function AdminLayout() {
  useDocumentMeta({ title: 'Admin | ZEROONEMOD', description: 'ZEROONEMOD admin panel.' });
  const { signOut } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = async () => {
    setDrawerOpen(false);
    await signOut();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-canvas text-white lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="border-b border-white/[0.08] bg-surface-sunken lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:border-b-0 lg:border-r">
        <div className="flex h-16 items-center justify-between gap-4 px-4 lg:h-20 lg:px-6">
          <Link to="/" aria-label="ZEROONEMOD home">
            <Wordmark />
          </Link>
          <div className="flex items-center gap-3">
            <span className="hidden rounded-full border border-white/15 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wider text-neutral-400 sm:inline-block lg:inline-block">
              Admin
            </span>
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              aria-expanded={drawerOpen}
              aria-controls="admin-drawer"
              aria-label="Open admin menu"
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white transition-colors duration-200 hover:bg-white/5 lg:hidden"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
          </div>
        </div>
        <nav aria-label="Admin" className="hidden px-3 lg:flex lg:flex-1 lg:flex-col lg:px-4 lg:pb-0">
          <ul className="flex flex-col gap-1">
            {ADMIN_NAV.map((item) => {
              const Icon = item.icon;
              return (
                <li key={item.to}>
                  <NavLink to={item.to} end={item.end} className={navLinkClass}>
                    <Icon className="h-4 w-4" aria-hidden="true" />
                    {item.label}
                  </NavLink>
                </li>
              );
            })}
          </ul>
        </nav>
        <div className="hidden px-4 pb-6 lg:block">
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-neutral-400 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white"
          >
            <LogOut className="h-4 w-4" aria-hidden="true" />
            Log out
          </button>
        </div>
      </aside>

      {drawerOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            aria-label="Close admin menu"
            onClick={() => setDrawerOpen(false)}
            className="absolute inset-0 bg-black/70"
          />
          <div
            id="admin-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Admin menu"
            className="absolute inset-y-0 right-0 flex w-72 max-w-[85%] flex-col border-l border-white/[0.08] bg-surface-sunken shadow-2xl"
          >
            <div className="flex h-16 items-center justify-between px-4">
              <span className="text-xs font-semibold uppercase tracking-wider text-neutral-400">Admin menu</span>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Close menu"
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/15 text-white hover:bg-white/5"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <nav aria-label="Admin" className="flex-1 overflow-y-auto px-3">
              <ul className="flex flex-col gap-1">
                {ADMIN_NAV.map((item) => {
                  const Icon = item.icon;
                  return (
                    <li key={item.to}>
                      <NavLink to={item.to} end={item.end} onClick={() => setDrawerOpen(false)} className={navLinkClass}>
                        <Icon className="h-4 w-4" aria-hidden="true" />
                        {item.label}
                      </NavLink>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <div className="border-t border-white/[0.08] p-4">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-sm text-neutral-400 transition-colors duration-200 hover:bg-white/[0.04] hover:text-white"
              >
                <LogOut className="h-4 w-4" aria-hidden="true" />
                Log out
              </button>
            </div>
          </div>
        </div>
      )}

      <main id="main" className="min-w-0 px-4 py-8 sm:px-8 lg:px-10 lg:py-12">
        <Outlet />
      </main>
    </div>
  );
}
