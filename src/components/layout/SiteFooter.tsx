import { Link } from 'react-router-dom';
import { Facebook, Instagram, type LucideProps } from 'lucide-react';
import { FOOTER_LEGAL_LINKS, FOOTER_NAV_COLUMNS, SOCIAL_LINKS } from '@/lib/navigation';
import { SITE_CONFIG } from '@/lib/siteConfig';
import { Wordmark } from '@/components/layout/Wordmark';

const linkClass = 'text-sm text-neutral-300 transition-colors duration-200 hover:text-brand-400';
const headingClass = 'text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400';

/** Outline WhatsApp mark in the same stroke style as the Lucide icons. */
function WhatsAppIcon(props: LucideProps) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
      <path d="M3 21l1.65-4.5A9 9 0 1 1 8 19.5L3 21z" />
      <path d="M9 9.5c0 3 2.5 5.5 5.5 5.5l1.2-1.4-2-1-.8.8c-1-.4-1.9-1.3-2.3-2.3l.8-.8-1-2L9 9.5z" />
    </svg>
  );
}

const SOCIAL_ICONS = { WhatsApp: WhatsAppIcon, Instagram, Facebook } as const;

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
          <p className={headingClass}>Navigation</p>
          <div className="grid grid-cols-2 gap-x-6">
            {FOOTER_NAV_COLUMNS.map((column, index) => (
              <ul key={index} className="flex flex-col gap-3">
                {column.map((link) => (
                  <li key={link.to}>
                    <Link to={link.to} className={linkClass}>
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            ))}
          </div>
        </nav>

        <div className="flex flex-col gap-3">
          <p className={headingClass}>Contact</p>
          <Link to="/contact" className={linkClass}>
            Contact us
          </Link>
          <a href={`mailto:${SITE_CONFIG.businessEmail}`} className={`break-all ${linkClass}`}>
            {SITE_CONFIG.businessEmail}
          </a>
          <ul className="mt-1 flex gap-3" aria-label="Social media">
            {SOCIAL_LINKS.map(({ label, href }) => {
              const Icon = SOCIAL_ICONS[label];
              const box =
                'inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10 text-neutral-300 transition-colors duration-200';
              return (
                <li key={label}>
                  {href ? (
                    <a href={href} target="_blank" rel="noopener noreferrer" aria-label={label} className={`${box} hover:border-brand-500 hover:text-brand-400`}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </a>
                  ) : (
                    <span role="img" aria-label={label} title={label} className={box}>
                      <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
                    </span>
                  )}
                </li>
              );
            })}
          </ul>
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
