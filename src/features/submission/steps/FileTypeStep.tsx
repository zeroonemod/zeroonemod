import { Cpu, Gauge } from 'lucide-react';
import { RadioCards } from '@/components/ui/RadioCards';
import { AttachedFiles } from '@/features/submission/AttachedFiles';
import type { FileType, StepProps } from '@/features/submission/types';

export function FileTypeStep({ form, errors, update }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <RadioCards<FileType>
        legend="Which control unit is this file for?"
        name="fileType"
        value={form.fileType}
        onChange={(value) => update('fileType', value)}
        error={errors.fileType}
        options={[
          { value: 'ECU', label: 'ECU (engine control unit)', description: 'Engine management file.', icon: <Cpu className="h-5 w-5" aria-hidden="true" /> },
          { value: 'TCU', label: 'TCU (transmission control unit)', description: 'Gearbox control file.', icon: <Gauge className="h-5 w-5" aria-hidden="true" /> },
        ]}
      />

      <div className="flex flex-col gap-4">
        <div>
          <p className="text-sm font-medium text-neutral-200">Original file(s)</p>
          <p className="mt-1 text-xs leading-relaxed text-neutral-400">
            Upload the untouched original file from your ECU or TCU. Any format, multiple files allowed.
          </p>
        </div>

        <AttachedFiles error={errors.files} />
      </div>
    </div>
  );
}
