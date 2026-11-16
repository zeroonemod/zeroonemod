import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { formatFileSize } from '@/lib/uploadLimits';
import { JOB_FILES_BUCKET, toStorageFileName } from '@/lib/storagePaths';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/features/jobs/jobFormat';
import type { JobFileRow } from '@/features/jobs/jobTypes';

/** Download links are short-lived: they are created on click and expire after five minutes. */
const SIGNED_URL_SECONDS = 300;

export async function openSignedFile(file: Pick<JobFileRow, 'storage_path' | 'file_name'>): Promise<void> {
  const { data, error } = await supabase.storage
    .from(JOB_FILES_BUCKET)
    .createSignedUrl(file.storage_path, SIGNED_URL_SECONDS, { download: file.file_name });
  if (error || !data?.signedUrl) throw new Error('Could not open this file. Please try again.');
  window.location.assign(data.signedUrl);
}

export function FileDownloadList({ files, emptyText, showDate = false }: { files: JobFileRow[]; emptyText: string; showDate?: boolean }) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (files.length === 0) return emptyText ? <p className="text-sm text-neutral-400">{emptyText}</p> : null;

  const handleOpen = async (file: JobFileRow) => {
    setError(null);
    setBusyId(file.id);
    try {
      await openSignedFile(file);
    } catch (openError) {
      setError(openError instanceof Error ? openError.message : 'Could not open this file.');
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="flex flex-col gap-3">
      <ul className="flex flex-col divide-y divide-white/[0.06]">
        {files.map((file) => (
          <li key={file.id} className="flex items-center justify-between gap-4 py-3">
            <div className="min-w-0">
              <p className="truncate text-sm text-white" title={file.file_name}>
                {file.file_name}
              </p>
              <p className="text-xs text-neutral-400">
                {formatFileSize(file.size_bytes)}
                {showDate && ` · ${formatDate(file.created_at)}`}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => handleOpen(file)} disabled={busyId === file.id} aria-label={`Download ${file.file_name}`}>
              {busyId === file.id ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" /> : <Download className="h-3.5 w-3.5" aria-hidden="true" />}
              Download
            </Button>
          </li>
        ))}
      </ul>
      {error && (
        <p role="alert" className="text-sm text-red-400">
          {error}
        </p>
      )}
    </div>
  );
}

interface FileUploaderProps {
  jobId: string;
  reference: string;
  kind: 'additional' | 'completed';
  title: string;
  description: string;
  onUploaded: (count: number) => void;
}

export function FileUploader({ jobId, reference, kind, title, description, onUploaded }: FileUploaderProps) {
  const [queued, setQueued] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async () => {
    if (queued.length === 0) return;
    setBusy(true);
    setError(null);
    const failed: string[] = [];
    let uploaded = 0;

    for (const file of queued) {
      const stamp = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`;
      const storagePath = `${reference}/${kind}/${stamp}-${toStorageFileName(file.name)}`;
      const { error: uploadError } = await supabase.storage
        .from(JOB_FILES_BUCKET)
        .upload(storagePath, file, { contentType: file.type || 'application/octet-stream', upsert: false });
      if (uploadError) {
        failed.push(file.name);
        continue;
      }
      const { error: rowError } = await supabase.from('job_files').insert({
        job_id: jobId,
        kind,
        file_name: file.name.slice(0, 200),
        storage_path: storagePath,
        size_bytes: file.size,
        mime_type: file.type || null,
      });
      if (rowError) failed.push(file.name);
      else uploaded += 1;
    }

    setBusy(false);
    setQueued([]);
    if (failed.length > 0) setError(`Could not upload: ${failed.join(', ')}. Please try again.`);
    if (uploaded > 0) onUploaded(uploaded);
  };

  return (
    <div className="flex flex-col gap-5">
      <UploadDropzone
        onFilesSelected={(files) => setQueued((current) => [...current, ...files])}
        title={title}
        description={description}
        error={error ?? undefined}
        compact
      />
      {queued.length > 0 && (
        <div className="flex flex-col gap-3">
          <ul className="flex flex-col gap-1 text-sm text-neutral-300">
            {queued.map((file, index) => (
              <li key={`${file.name}-${index}`} className="flex justify-between gap-4">
                <span className="truncate">{file.name}</span>
                <span className="shrink-0 text-neutral-500">{formatFileSize(file.size)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
            <Button variant="ghost" onClick={() => setQueued([])} disabled={busy}>
              Clear
            </Button>
            <Button onClick={handleUpload} disabled={busy}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
              {busy ? 'Uploading' : `Upload ${queued.length === 1 ? 'file' : `${queued.length} files`}`}
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
