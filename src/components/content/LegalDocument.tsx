import type { ReactNode } from 'react';
import { ContentPage } from '@/components/content/ContentPage';
import { SITE_CONFIG } from '@/lib/siteConfig';

interface LegalSection {
  heading: string;
  body: ReactNode;
}

interface LegalDocumentProps {
  title: string;
  description: string;
  updated: string;
  sections: LegalSection[];
}

export function LegalDocument({ title, description, updated, sections }: LegalDocumentProps) {
  return (
    <ContentPage label="Legal" title={title} intro={`Last updated: ${updated}`} description={description}>
      <div className="max-w-3xl">
        <div className="mb-12 rounded-2xl border border-white/20 bg-surface-raised p-6 text-sm leading-[1.5] text-neutral-300">
          Placeholder notice: company details marked in square brackets must be replaced with the registered
          details of {SITE_CONFIG.companyLegalName}, {SITE_CONFIG.companyAddress}, {SITE_CONFIG.companyTaxId} before
          this page is relied upon.
        </div>
        <article className="flex flex-col gap-10 text-base leading-[1.5] text-neutral-300">
          {sections.map((section) => (
            <section key={section.heading} className="flex flex-col gap-4">
              <h2 className="text-xl font-bold leading-[1.2] text-white">{section.heading}</h2>
              {section.body}
            </section>
          ))}
        </article>
      </div>
    </ContentPage>
  );
}

export function LegalParagraphs({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
