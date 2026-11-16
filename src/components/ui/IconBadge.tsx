import type { ReactNode } from 'react';

interface IconBadgeProps {
  children: ReactNode;
  shape?: 'square' | 'circle';
  className?: string;
}

export function IconBadge({ children, shape = 'square', className = '' }: IconBadgeProps) {
  return (
    <span
      aria-hidden="true"
      className={`inline-flex h-11 w-11 shrink-0 items-center justify-center border border-brand-500/40 bg-brand-500/[0.08] text-brand-500 transition-[border-color,box-shadow] duration-300 group-hover:border-brand-500 group-hover:shadow-[0_0_20px_rgba(225,29,46,0.2)] ${
        shape === 'circle' ? 'rounded-full' : 'rounded-xl'
      } ${className}`}
    >
      {children}
    </span>
  );
}
