import type { SelectHTMLAttributes } from 'react';
import { controlClass, describedBy, Field } from '@/components/ui/FormField';

export const CHEVRON =
  "url(\"data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' stroke='%23A3A3A3' stroke-width='2' viewBox='0 0 24 24'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E\")";

export interface SelectOption {
  value: string;
  label: string;
}

interface SelectInputProps extends SelectHTMLAttributes<HTMLSelectElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  hideLabel?: boolean;
  options: readonly SelectOption[];
  placeholder?: string;
}

/** Native select with the shared control style and a custom chevron on the far right. */
export function SelectInput({ id, label, error, hint, optional, hideLabel, options, placeholder, className = '', ...props }: SelectInputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} optional={optional} hideLabel={hideLabel}>
      <select
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlClass(Boolean(error))} h-11 cursor-pointer appearance-none bg-no-repeat pl-4 pr-10 ${className}`}
        style={{ backgroundImage: CHEVRON, backgroundPosition: 'right 14px center', backgroundSize: '18px 18px' }}
        {...props}
      >
        {placeholder !== undefined && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}
