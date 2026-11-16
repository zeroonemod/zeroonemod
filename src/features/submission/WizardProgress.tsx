interface WizardProgressProps {
  current: number;
  total: number;
  labels: readonly string[];
}

export function WizardProgress({ current, total, labels }: WizardProgressProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
        <span>
          Step {current + 1} of {total}
        </span>
        <span className="text-neutral-200">{labels[current]}</span>
      </div>
      <div role="progressbar" aria-valuemin={1} aria-valuemax={total} aria-valuenow={current + 1} aria-label="Submission progress" className="grid grid-cols-3 gap-1.5">
        {labels.map((label, index) => (
          <span
            key={label}
            className={`h-0.5 rounded-full transition-colors duration-500 ${index <= current ? 'bg-brand-500' : 'bg-white/10'}`}
          />
        ))}
      </div>
    </div>
  );
}
