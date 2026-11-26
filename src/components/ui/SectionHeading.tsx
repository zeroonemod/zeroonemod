import type { ReactNode } from 'react';

interface SectionHeadingProps {
  eyebrow?: string;
  /** Optional: without a title the red eyebrow label becomes the section heading. */
  title?: string;
  description?: ReactNode;
  align?: 'left' | 'center';
}

export function SectionHeading({ eyebrow, title, description, align = 'center' }: SectionHeadingProps) {
  const alignment = align === 'center' ? 'mx-auto items-center text-center' : 'items-start text-left';
  return (
    <div className={`flex max-w-2xl flex-col gap-4 ${alignment}`}>
      {eyebrow && (title ? <p className="eyebrow">{eyebrow}</p> : <h2 className="eyebrow">{eyebrow}</h2>)}
      <span className="h-0.5 w-6 rounded-full bg-brand-500" aria-hidden="true" />
      {title && <h2 className="text-3xl font-bold leading-[1.2] tracking-tight text-white sm:text-4xl">{title}</h2>}
      {description && <div className="text-base leading-[1.5] text-neutral-400">{description}</div>}
    </div>
  );
}
