import { JOB_STATUSES, type JobStatus } from '@/features/jobs/jobTypes';
import { statusBadgeClass } from '@/features/jobs/jobFormat';

export function StatusBadge({ status }: { status: JobStatus }) {
  const isDone = status === 'Delivered' || status === 'Completed';
  return (
    <span className={`inline-flex items-center gap-2 whitespace-nowrap rounded-full border px-2.5 py-1 text-xs font-medium ${statusBadgeClass(status)}`}>
      {isDone && <span className="h-1.5 w-1.5 rounded-full bg-white" aria-hidden="true" />}
      {status}
    </span>
  );
}

export function StatusStepper({ status }: { status: JobStatus }) {
  const currentIndex = JOB_STATUSES.indexOf(status);
  const lastIndex = JOB_STATUSES.length - 1;
  const percent = Math.round(((currentIndex + 1) / JOB_STATUSES.length) * 100);

  return (
    <>
      <ol aria-label="Job progress" className="hidden gap-2 sm:grid sm:grid-cols-8">
        {JOB_STATUSES.map((step, index) => {
          const isDone = index < currentIndex;
          const isCurrent = index === currentIndex;
          return (
            <li key={step} aria-current={isCurrent ? 'step' : undefined} className="relative flex flex-col items-center gap-2.5 text-center">
              {index < lastIndex && (
                <span
                  className={`absolute left-1/2 top-[5px] h-px w-full ${isDone ? 'bg-white/60' : 'bg-white/10'}`}
                  aria-hidden="true"
                />
              )}
              <span
                aria-hidden="true"
                className={`relative h-2.5 w-2.5 rounded-full ${
                  isCurrent ? 'bg-brand-500 shadow-[0_0_12px_rgba(225,29,46,0.7)] ring-4 ring-brand-500/25' : isDone ? 'bg-white' : 'bg-neutral-600'
                }`}
              />
              <span
                className={`text-[11px] leading-tight ${
                  isCurrent ? 'font-semibold text-brand-400' : isDone ? 'text-neutral-200' : 'text-neutral-500'
                }`}
              >
                {step}
              </span>
            </li>
          );
        })}
      </ol>

      <div className="flex flex-col gap-3 sm:hidden">
        <div className="flex items-baseline justify-between gap-3">
          <p className="text-xl font-semibold leading-[1.2] text-white">{status}</p>
          <p className="whitespace-nowrap text-xs text-neutral-400">
            Step {currentIndex + 1} of {JOB_STATUSES.length}
          </p>
        </div>
        <div role="progressbar" aria-label="Job progress" aria-valuemin={1} aria-valuemax={JOB_STATUSES.length} aria-valuenow={currentIndex + 1} className="h-1 w-full overflow-hidden rounded-full bg-white/10">
          <div className="h-full rounded-full bg-brand-500 transition-[width] duration-500 ease-out" style={{ width: `${percent}%` }} />
        </div>
      </div>
    </>
  );
}
