import { formatFileSize } from '@/lib/uploadLimits';
import { CUSTOMER_TYPE_OPTIONS, SERVICE_OPTIONS, type StepProps } from '@/features/submission/types';

interface ConfirmSummaryProps {
  form: StepProps['form'];
  files: File[];
}

export function ConfirmSummary({ form, files }: ConfirmSummaryProps) {
  const serviceLabel = SERVICE_OPTIONS.find((option) => option.value === form.requestedService)?.label ?? '';
  const customerTypeLabel = CUSTOMER_TYPE_OPTIONS.find((option) => option.value === form.customerType)?.label ?? '';
  const rows: [string, string][] = [
    ['Control unit', form.fileType],
    ['Files', files.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(', ')],
    ['Service', serviceLabel],
    ['Vehicle', `${form.year} ${form.make.trim()} ${form.model.trim()} · ${form.engine.trim()} · ${form.fuelType}`],
    ['VIN', form.vin.trim().toUpperCase()],
    ['Customer', `${form.firstName.trim()} ${form.lastName.trim()} · ${customerTypeLabel}`],
    ['Email', form.email.trim()],
  ];

  return (
    <dl className="grid gap-x-4 gap-y-2 rounded-xl border border-white/10 bg-surface-sunken p-4 text-sm sm:grid-cols-[8rem_1fr]">
      {rows.map(([label, value]) => (
        <div key={label} className="contents">
          <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
          <dd className="break-words text-neutral-100">{value || '-'}</dd>
        </div>
      ))}
    </dl>
  );
}
