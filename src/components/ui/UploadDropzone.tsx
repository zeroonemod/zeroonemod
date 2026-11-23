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
}

/** Help text under the original-file upload (home card, wizard, guest and partner forms). */
const ORIGINAL_FILE_HELP = (
  <>
    <span className="block text-xs font-semibold uppercase tracking-[0.14em] text-neutral-300">ECU or TCU decrypted file (.bin or .ori)</span>
    <span className="mt-1.5 block">Passenger cars only. Trucks and other heavy vehicles are not supported.</span>
  </>
);

export function UploadDropzone({
  onFilesSelected,
  title = 'Drag and drop your original ECU/TCU file or click to upload',
  description = ORIGINAL_FILE_HELP,
  error,
  className = '',
  compact = false,
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
        onClick={() => inputRef.current?.click()}
        onKeyDown={handleKeyDown}
        onDragOver={(event) => {
          event.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={handleDrop}
        className={`group flex cursor-pointer flex-col items-center justify-center gap-4 rounded-xl border border-dashed px-6 text-center transition-colors duration-200 ${compact ? 'min-h-[150px] py-8' : 'min-h-[220px] py-10 sm:min-h-[260px]'} ${
          isDragging ? 'border-brand-500 bg-brand-500/[0.06]' : 'border-white/20 bg-surface-sunken hover:border-brand-500 hover:bg-white/[0.02]'
        } ${error ? 'border-brand-500' : ''}`}
      >
        <span className="flex h-12 w-12 items-center justify-center rounded-full border border-brand-500/40 bg-brand-500/[0.08] text-brand-500 transition-transform duration-200 group-hover:-translate-y-0.5">
          <Upload className="h-5 w-5" aria-hidden="true" />
        </span>
        <div className="flex max-w-md flex-col gap-2">
          <p className="text-base font-medium text-white">{title}</p>
          <p id={`${inputId}-help`} className="text-sm leading-relaxed text-neutral-400">
            {description}
          </p>
        </div>
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          multiple
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
