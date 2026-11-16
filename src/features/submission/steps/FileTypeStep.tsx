import { Cpu, Gauge, X } from 'lucide-react';
import { RadioCards } from '@/components/ui/RadioCards';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { formatFileSize } from '@/lib/uploadLimits';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import type { FileType, StepProps } from '@/features/submission/types';

export function FileTypeStep({ form, errors, update }: StepProps) {
  const { files, addFiles, removeFile } = useSubmissionFiles();

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

        {files.length > 0 && (
          <ul className="flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-surface-sunken">
            {files.map((file, index) => (
              <li key={`${index}-${file.name}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{file.name}</p>
                  <p className="text-xs text-neutral-400">{formatFileSize(file.size)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => removeFile(index)}
                  aria-label={`Remove ${file.name}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}

        <UploadDropzone
          onFilesSelected={addFiles}
          title={files.length > 0 ? 'Add another file' : 'Drag and drop your original ECU/TCU file or click to upload'}
          description="Any file format. Up to 100 MB per file. Multiple files allowed."
          error={errors.files}
        />
      </div>
    </div>
  );
}
