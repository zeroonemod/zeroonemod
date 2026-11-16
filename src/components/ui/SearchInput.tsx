import type { InputHTMLAttributes } from 'react';
import { Search } from 'lucide-react';
import { controlClass } from '@/components/ui/FormField';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  id: string;
  label: string;
  hideLabel?: boolean;
}

/** Search field with the magnifier on the left and enough padding so it never overlaps the text. */
export function SearchInput({ id, label, hideLabel, className = '', ...props }: SearchInputProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm font-medium text-neutral-200'}>
        {label}
      </label>
      <div className="relative">
        <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-neutral-500" aria-hidden="true" />
        <input id={id} type="search" className={`${controlClass()} h-11 pl-10 ${className}`} {...props} />
      </div>
    </div>
  );
}
