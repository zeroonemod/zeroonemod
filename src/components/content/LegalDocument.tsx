import type { ReactNode } from 'react';
import { ContentPage } from '@/components/content/ContentPage';

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
      <article className="flex max-w-3xl flex-col gap-10 text-base leading-[1.5] text-neutral-300">
        {sections.map((section) => (
          <section key={section.heading} className="flex flex-col gap-4">
            <h2 className="text-xl font-bold leading-[1.2] text-white">{section.heading}</h2>
            {section.body}
          </section>
        ))}
      </article>
    </ContentPage>
  );
}

export function LegalParagraphs({ children }: { children: ReactNode }) {
  return <div className="flex flex-col gap-4">{children}</div>;
}
