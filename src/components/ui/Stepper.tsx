interface StepProgressProps {
  current: number;
  labels: readonly string[];
  ariaLabel: string;
}

/** "Step X of N" with a thin segmented red bar. Used by the submission wizard. */
export function StepProgress({ current, labels, ariaLabel }: StepProgressProps) {
  const total = labels.length;
  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center justify-between gap-4 text-xs font-medium uppercase tracking-[0.14em] text-neutral-400">
        <span className="whitespace-nowrap">
          Step {current + 1} of {total}
        </span>
        <span className="text-right text-neutral-200">{labels[current]}</span>
      </div>
      <div
        role="progressbar"
        aria-valuemin={1}
        aria-valuemax={total}
        aria-valuenow={current + 1}
        aria-label={ariaLabel}
        className="grid gap-1.5"
        style={{ gridTemplateColumns: `repeat(${total}, minmax(0, 1fr))` }}
      >
        {labels.map((label, index) => (
          <span key={label} className={`h-0.5 rounded-full transition-colors duration-500 ${index <= current ? 'bg-brand-500' : 'bg-white/10'}`} />
        ))}
      </div>
    </div>
  );
}

interface StatusStepperProps {
  steps: readonly string[];
  current: string;
}

/** Horizontal stepper on desktop, "Step X of N" with a thin bar on mobile. */
export function StatusStepper({ steps, current }: StatusStepperProps) {
  const currentIndex = Math.max(0, steps.indexOf(current));
  const lastIndex = steps.length - 1;
  const percent = Math.round(((currentIndex + 1) / steps.length) * 100);

  return (
    <>
      <ol aria-label="Job progress" className="hidden gap-2 sm:grid" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }}>
        {steps.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={step} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-2.5 text-center">
              {index < lastIndex && (
                <span className={`absolute left-1/2 top-[5px] h-px w-full ${isDone ? 'bg-white/60' : 'bg-white/10'}`} aria-hidden="true" />
              )}
              <span
                aria-hidden="true"
                className={`relative h-2.5 w-2.5 rounded-full ${
                  isCurrent ? 'bg-brand-500 shadow-[0_0_12px_rgba(225,29,46,0.7)] ring-4 ring-brand-500/25' : isDone ? 'bg-white' : 'bg-neutral-600'
                }`}
              />
              <span className={`text-[11px] leading-tight ${isCurrent ? 'font-semibold text-brand-400' : isDone ? 'text-neutral-200' : 'text-neutral-500'}`}>
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xl font-semibold leading-[1.2] text-white">{steps[currentIndex]}</p>
          <p className="whitespace-nowrap text-xs text-neutral-400">
            Step {currentIndex + 1} of {steps.length}
          </p>
        </div>
        <div
          role="progressbar"
          aria-label="Job progress"
          aria-valuemin={1}
          aria-valuemax={steps.length}
          aria-valuenow={currentIndex + 1}
          className="h-1 w-full overflow-hidden rounded-full bg-white/10"
        >
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </>
  );
}
