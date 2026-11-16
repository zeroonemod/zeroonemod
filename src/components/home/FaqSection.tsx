import { useEffect, useState } from 'react';
import { ChevronDown } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { SectionHeading } from '@/components/ui/SectionHeading';

interface FaqItem {
  id: string;
  question: string;
  answer: string;
}

type LoadState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; items: FaqItem[] };

function isFaqItem(value: unknown): value is FaqItem {
  if (typeof value !== 'object' || value === null) return false;
  const item = value as Record<string, unknown>;
  return typeof item.id === 'string' && typeof item.question === 'string' && typeof item.answer === 'string';
}

export function FaqSection() {
  const [state, setState] = useState<LoadState>({ status: 'loading' });
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    supabase
      .from('faq_items')
      .select('id, question, answer')
      .order('sort_order', { ascending: true })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error || !Array.isArray(data) || !data.every(isFaqItem)) {
          setState({ status: 'error' });
          return;
        }
        setState({ status: 'ready', items: data });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <section id="faq" className="scroll-mt-24 border-t border-white/[0.06] py-12 sm:py-16 lg:py-20">
      <div className="mx-auto flex max-w-3xl flex-col gap-12 px-5 sm:px-8">
        <SectionHeading eyebrow="FAQ" title="Frequently asked questions" />

        {state.status === 'loading' && (
          <div className="flex flex-col gap-3" aria-label="Loading questions" role="status">
            {[0, 1, 2].map((item) => (
              <div key={item} className="h-16 animate-pulse rounded-xl border border-white/[0.08] bg-surface" />
            ))}
          </div>
        )}

        {state.status === 'error' && (
          <p role="alert" className="text-center text-sm text-neutral-400">
            We could not load the questions right now. Please refresh the page.
          </p>
        )}

        {state.status === 'ready' && (
          <ul className="flex flex-col gap-3">
            {state.items.map((item) => {
              const isOpen = openId === item.id;
              const panelId = `faq-panel-${item.id}`;
              return (
                <li
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-white/[0.08] bg-surface transition-colors duration-200 hover:border-white/15"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    aria-controls={panelId}
                    onClick={() => setOpenId(isOpen ? null : item.id)}
                    className="flex w-full items-center justify-between gap-6 px-5 py-5 text-left sm:px-6"
                  >
                    <span className="text-sm font-medium text-white sm:text-base">{item.question}</span>
                    <ChevronDown
                      className={`h-5 w-5 shrink-0 text-neutral-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  <div
                    id={panelId}
                    role="region"
                    hidden={!isOpen}
                    className="px-5 pb-5 text-sm leading-[1.5] text-neutral-400 sm:px-6"
                  >
                    {item.answer}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </section>
  );
}
