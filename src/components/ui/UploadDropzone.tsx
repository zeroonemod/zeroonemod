import { useId, useRef, useState, type DragEvent, type KeyboardEvent, type ReactNode } from 'react';
import { Upload } from 'lucide-react';
import { MAX_FILE_BYTES } from '@/lib/uploadLimits';

interface UploadDropzoneProps {
  onFilesSelected: (files: File[]) => void;
  title?: string;
  description?: ReactNode;
  error?: string;
  className?: string;
  /** Smaller drop area for dashboard and admin uploads. */
  compact?: boolean;
  /** File types the picker offers, for example "image/*". Default: any file. */
  accept?: string;
  /** Icon in the circle. Default: upload arrow. */
  icon?: ReactNode;
}

/** Help text under the original-file upload (home card, wizard, guest and partner forms). */
const ORIGINAL_FILE_HELP = (
  <>
    <span className="mx-auto block w-fit rounded-md border border-white/10 bg-white/[0.03] px-2.5 py-1 text-[11px] font-semibold uppercase leading-snug tracking-[0.08em] text-neutral-300 [text-wrap:balance] sm:text-xs sm:tracking-[0.14em]">
      ECU or TCU decrypted file
    </span>
    <span className="mt-2.5 block text-xs leading-relaxed [text-wrap:balance] sm:text-sm">Cars only</span>
  </>
);

const DEFAULT_TITLE = 'Drag and drop your original ECU/TCU file or click to upload';

export function UploadDropzone({
  onFilesSelected,
  title = DEFAULT_TITLE,
  description = ORIGINAL_FILE_HELP,
  error,
  className = '',
  compact = false,
  accept,
  icon,
}: UploadDropzoneProps) {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeError, setSizeError] = useState<string | null>(null);

  const handleFiles = (list: FileList | null) => {
    if (!list || list.length === 0) return;
    const all = Array.from(list);
    const accepted = all.filter((file) => file.size <= MAX_FILE_BYTES);
    const rejected = all.filter((file) => file.size > MAX_FILE_BYTES);
    setSizeError(
      rejected.length > 0
        ? `${rejected.map((file) => file.name).join(', ')} ${rejected.length > 1 ? 'are' : 'is'} larger than 100 MB and was not added.`
        : null,
    );
    if (accepted.length > 0) onFilesSelected(accepted);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleDrop = (event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    setIsDragging(false);
    handleFiles(event.dataTransfer.files);
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      inputRef.current?.click();
    }
  };

  const message = error ?? sizeError;

  return (
    <div className={className}>
      <div
        role="button"
        tabIndex={0}
        aria-describedby={`${inputId}-help`}
        aria-invalid={error ? true : undefined}
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-5 text-center transition-colors duration-200 sm:px-6 ${compact ? 'min-h-[150px] py-8' : 'min-h-[200px] py-8 sm:min-h-[260px] sm:py-10'} ${
          isDragging ? 'border-brand-500 bg-brand-500/[0.06]' : 'border-white/20 bg-surface-sunken hover:border-brand-500 hover:bg-white/[0.02]'
        } ${error ? 'border-brand-500' : ''}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/40 bg-brand-500/[0.08] text-brand-500 transition-transform duration-200 group-hover:-translate-y-0.5">
          {icon ?? <Upload className="h-5 w-5" aria-hidden="true" />}
        </span>
        <div className="flex max-w-md flex-col gap-3 sm:gap-2">
          <p className="text-[15px] font-medium leading-snug text-white [text-wrap:balance] sm:text-base">
            {title === DEFAULT_TITLE ? (
              <>
                {/* Phones have no drag and drop: a short, direct instruction. */}
                <span className="sm:hidden">Tap to upload your original ECU/TCU file</span>
                <span className="hidden sm:inline">{title}</span>
              </>
            ) : (
              title
            )}
          </p>
          <p id={`${inputId}-help`} className="text-sm leading-relaxed text-neutral-400">
            {description}
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
          accept={accept}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(event) => handleFiles(event.target.files)}
        />
      </div>
      {message && (
        <p role="alert" className="mt-3 text-sm text-red-400">
          {message}
        </p>
      )}
    </div>
  );
}
