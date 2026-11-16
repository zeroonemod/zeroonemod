import { Link } from 'react-router-dom';
import { FOOTER_LEGAL_LINKS, NAV_LINKS } from '@/lib/navigation';
import { SITE_CONFIG } from '@/lib/siteConfig';
import { Wordmark } from '@/components/layout/Wordmark';

export function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-t-brand-500/70 border-white/[0.08] bg-canvas">
      <div className="mx-auto grid max-w-7xl gap-12 px-5 py-14 sm:px-8 md:grid-cols-[1.2fr_1fr_1fr]">
        <div className="flex flex-col gap-4">
          <Wordmark className="h-5" />
          <p className="max-w-xs text-sm leading-relaxed text-neutral-400">{SITE_CONFIG.descriptor}</p>
        </div>

        <nav aria-label="Footer" className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Navigation</p>
          <ul className="grid grid-cols-2 gap-x-6 gap-y-3">
            {NAV_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="text-sm text-neutral-300 transition-colors duration-200 hover:text-brand-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="flex flex-col gap-3">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Contact</p>
          <a
            href={`mailto:${SITE_CONFIG.businessEmail}`}
            className="text-sm text-neutral-300 transition-colors duration-200 hover:text-brand-400"
          >
            {SITE_CONFIG.businessEmail}
          </a>
          <p className="text-xs leading-relaxed text-neutral-500">
            {SITE_CONFIG.companyLegalName} · {SITE_CONFIG.companyAddress} · {SITE_CONFIG.companyTaxId}
          </p>
        </div>
      </div>

      <div className="border-t border-white/[0.06]">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-5 py-6 text-xs text-neutral-400 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <p>© {year} ZEROONEMOD. All rights reserved.</p>
          <ul className="flex flex-wrap gap-x-6 gap-y-2">
            {FOOTER_LEGAL_LINKS.map((link) => (
              <li key={link.to}>
                <Link to={link.to} className="transition-colors duration-200 hover:text-brand-400">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
