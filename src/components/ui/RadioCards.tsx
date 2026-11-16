import { useId, type ReactNode } from 'react';

interface RadioCardOption<T extends string> {
  value: T;
  label: string;
  description?: string;
  icon?: ReactNode;
}

interface RadioCardsProps<T extends string> {
  legend: string;
  name: string;
  options: RadioCardOption<T>[];
  value: T | '';
  onChange: (value: T) => void;
  error?: string;
  columns?: 'two' | 'three';
}

export function RadioCards<T extends string>({ legend, name, options, value, onChange, error, columns = 'two' }: RadioCardsProps<T>) {
  const groupId = useId();
  const grid = columns === 'three' ? 'sm:grid-cols-3' : 'sm:grid-cols-2';

  return (
    <fieldset className="flex flex-col gap-3">
      <legend className="mb-3 text-sm font-medium text-neutral-200">{legend}</legend>
      <div className={`grid gap-3 ${grid}`}>
        {options.map((option) => {
          const id = `${groupId}-${option.value}`;
          const checked = value === option.value;
          return (
            <label
              key={option.value}
              htmlFor={id}
              className={`flex cursor-pointer items-start gap-4 rounded-xl border p-4 transition-colors duration-200 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-brand-500/40 ${
                checked
                  ? 'border-brand-500/60 bg-brand-500/[0.06]'
                  : 'border-white/10 bg-surface-sunken hover:border-white/25'
              }`}
            >
              <input
                id={id}
                type="radio"
                name={name}
                value={option.value}
                checked={checked}
                onChange={() => onChange(option.value)}
                className="sr-only"
              />
              {option.icon && (
                <span className={`mt-0.5 shrink-0 ${checked ? 'text-white' : 'text-neutral-400'}`}>{option.icon}</span>
              )}
              <span className="flex flex-col gap-1">
                <span className="text-sm font-medium text-white">{option.label}</span>
                {option.description && <span className="text-xs leading-relaxed text-neutral-400">{option.description}</span>}
              </span>
              <span
                aria-hidden="true"
                className={`ml-auto mt-0.5 h-4 w-4 shrink-0 rounded-full border ${
                  checked ? 'border-[5px] border-brand-500 bg-white' : 'border-white/30'
                }`}
              />
            </label>
          );
        })}
      </div>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </fieldset>
  );
}
