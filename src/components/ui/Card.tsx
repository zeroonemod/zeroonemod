import type { ReactNode } from 'react';

interface CardProps {
  children: ReactNode;
  className?: string;
  padding?: 'sm' | 'md' | 'lg';
}

export function Card({ children, className = '', padding = 'md' }: CardProps) {
  const pad = padding === 'lg' ? 'p-6 sm:p-10' : padding === 'sm' ? 'p-5 sm:p-6' : 'p-6 sm:p-8';
  return (
    <div
      className={`rounded-2xl border border-white/[0.08] border-t-2 border-t-brand-500/60 bg-surface transition-[transform,border-color] duration-300 hover:-translate-y-0.5 hover:border-brand-500/50 ${pad} ${className}`}
    >
      {children}
    </div>
  );
}
