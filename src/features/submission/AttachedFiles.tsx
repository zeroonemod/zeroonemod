import { X } from 'lucide-react';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { formatFileSize } from '@/lib/uploadLimits';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';

/** Files attached to the current submission (kept on the device until submit), with remove buttons and a dropzone. */
export function AttachedFiles({ error }: { error?: string }) {
  const { files, addFiles, removeFile } = useSubmissionFiles();

  return (
    <>
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
        error={error}
      />
    </>
  );
}
