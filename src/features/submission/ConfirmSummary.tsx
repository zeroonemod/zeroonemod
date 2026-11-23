import { formatFileSize } from '@/lib/uploadLimits';
import { CUSTOMER_TYPE_OPTIONS, GEARBOX_OPTIONS, SERVICE_OPTIONS, type StepProps } from '@/features/submission/types';

interface ConfirmSummaryProps {
  form: StepProps['form'];
  files: File[];
  photos: File[];
  guest?: boolean;
}

export function ConfirmSummary({ form, files, photos, guest = false }: ConfirmSummaryProps) {
  const serviceLabel = SERVICE_OPTIONS.find((option) => option.value === form.requestedService)?.label ?? '';
  const customerTypeLabel = CUSTOMER_TYPE_OPTIONS.find((option) => option.value === form.customerType)?.label ?? '';
  const gearboxLabel = GEARBOX_OPTIONS.find((option) => option.value === form.gearboxType)?.label ?? '';
  const power = form.power.trim() ? `${form.power.trim()} ${form.powerUnit}` : '';
  const torque = form.torque.trim() ? `${form.torque.trim()} Nm` : '';

  const rows: [string, string][] = [
    ['Control unit', form.fileType],
    ['Files', files.map((file) => `${file.name} (${formatFileSize(file.size)})`).join(', ')],
    ...(photos.length ? [['Photos', `${photos.length} hardware photo${photos.length === 1 ? '' : 's'}`] as [string, string]] : []),
    ['Service', serviceLabel],
    ['Vehicle', `${form.year} ${form.make.trim()} ${form.model.trim()} · ${form.engine.trim()} · ${form.fuelType}`],
    ['Power / torque', [power, torque].filter(Boolean).join(' · ')],
    ['Gearbox', gearboxLabel],
    ['Modified before', form.previouslyModified === 'yes' ? 'Yes' : form.previouslyModified === 'no' ? 'No' : ''],
    ['VIN', form.vin.trim().toUpperCase()],
    ...(guest
      ? ([
          ['Email', form.email.trim()],
          ['Phone', form.phone.trim()],
        ] as [string, string][])
      : ([
          ['Customer', `${form.firstName.trim()} ${form.lastName.trim()} · ${customerTypeLabel}`],
          ['Email', form.email.trim()],
        ] as [string, string][])),
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
