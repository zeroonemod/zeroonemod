import type { InputHTMLAttributes, ReactNode, TextareaHTMLAttributes } from 'react';

const controlBase =
  'w-full rounded-lg border bg-surface-sunken px-3.5 text-sm text-white placeholder:text-neutral-500 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-brand-500/30 disabled:opacity-50';

/** One shared style for every input, select and textarea on the site. */
export function controlClass(hasError = false) {
  return `${controlBase} ${hasError ? 'border-brand-500' : 'border-white/10 hover:border-white/20 focus:border-brand-500'}`;
}

export function describedBy(id: string, error?: string, hint?: string) {
  return error ? `${id}-error` : hint ? `${id}-hint` : undefined;
}

interface FieldProps {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  hideLabel?: boolean;
  children: ReactNode;
}

export function Field({ id, label, error, hint, optional, hideLabel, children }: FieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label htmlFor={id} className={hideLabel ? 'sr-only' : 'text-sm font-medium text-neutral-200'}>
        {label}
        {optional && <span className="ml-1.5 font-normal text-neutral-400">(optional)</span>}
      </label>
      {children}
      {error ? (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      ) : hint ? (
        <p id={`${id}-hint`} className="text-xs leading-relaxed text-neutral-400">
          {hint}
        </p>
      ) : null}
    </div>
  );
}

interface TextInputProps extends InputHTMLAttributes<HTMLInputElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  hideLabel?: boolean;
}

export function TextInput({ id, label, error, hint, optional, hideLabel, className = '', ...props }: TextInputProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} optional={optional} hideLabel={hideLabel}>
      <input
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlClass(Boolean(error))} h-11 ${className}`}
        {...props}
      />
    </Field>
  );
}

interface TextAreaProps extends TextareaHTMLAttributes<HTMLTextAreaElement> {
  id: string;
  label: string;
  error?: string;
  hint?: string;
  optional?: boolean;
  hideLabel?: boolean;
}

export function TextArea({ id, label, error, hint, optional, hideLabel, className = '', ...props }: TextAreaProps) {
  return (
    <Field id={id} label={label} error={error} hint={hint} optional={optional} hideLabel={hideLabel}>
      <textarea
        id={id}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(id, error, hint)}
        className={`${controlClass(Boolean(error))} min-h-28 resize-y py-3 leading-relaxed ${className}`}
        {...props}
      />
    </Field>
  );
}

interface CheckboxFieldProps {
  id: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  error?: string;
  children: ReactNode;
}

export function CheckboxField({ id, checked, onChange, error, children }: CheckboxFieldProps) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="flex cursor-pointer items-start gap-3 text-sm leading-relaxed text-neutral-300">
        <input
          id={id}
          type="checkbox"
          checked={checked}
          onChange={(event) => onChange(event.target.checked)}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? `${id}-error` : undefined}
          className="mt-0.5 h-5 w-5 shrink-0 cursor-pointer rounded border-white/20 bg-surface-sunken accent-brand-500 focus-visible:ring-2 focus-visible:ring-brand-500/40"
        />
        <span>{children}</span>
      </label>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}
