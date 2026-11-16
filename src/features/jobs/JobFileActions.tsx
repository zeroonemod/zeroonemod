import { useState } from 'react';
import { Download, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Dropzone } from '@/components/ui/Dropzone';
import { formatFileSize } from '@/lib/uploadLimits';
import { JOB_FILES_BUCKET, toStorageFileName } from '@/lib/storagePaths';
import { supabase } from '@/lib/supabase';
import type { JobFileRow } from '@/features/jobs/jobTypes';

const SIGNED_URL_SECONDS = 300;

export async function openSignedFile(path: string): Promise<void> {
  const { data, error } = await supabase.storage.from(JOB_FILES_BUCKET).createSignedUrl(path, SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) throw new Error('Could not open this file. Please try again.');
  window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
}

export function FileDownloadList({ files, emptyText }: { files: JobFileRow[]; emptyText: string }) {
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  if (files.length === 0) return <p className="text-sm text-neutral-400">{emptyText}</p>;

  const handleOpen = async (file: JobFileRow) => {
    setError(null);
    setBusyId(file.id);
    try {
      await openSignedFile(file.storage_path);
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
              <p className="truncate text-sm text-white">{file.file_name}</p>
              <p className="text-xs text-neutral-400">{formatFileSize(file.size_bytes)}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => handleOpen(file)} disabled={busyId === file.id}>
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
  onUploaded: () => void;
}

export function FileUploader({ jobId, reference, kind, title, description, onUploaded }: FileUploaderProps) {
  const [queued, setQueued] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const folder = kind === 'completed' ? 'completed' : 'additional';

  const handleUpload = async () => {
    if (queued.length === 0) return;
    setBusy(true);
    setError(null);
    const failed: string[] = [];

    for (const file of queued) {
      const stamp = Date.now().toString(36);
      const storagePath = `${reference}/${folder}/${stamp}-${toStorageFileName(file.name)}`;
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
    }

    setBusy(false);
    setQueued([]);
    if (failed.length > 0) setError(`Could not upload: ${failed.join(', ')}. Please try again.`);
    onUploaded();
  };

  return (
    <div className="flex flex-col gap-5">
      <Dropzone
        onFilesSelected={(files) => setQueued((current) => [...current, ...files])}
        title={title}
        description={description}
        error={error ?? undefined}
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
          <Button onClick={handleUpload} disabled={busy} className="w-full sm:w-auto sm:self-end">
            {busy ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Upload className="h-4 w-4" aria-hidden="true" />}
            {busy ? 'Uploading' : 'Upload files'}
          </Button>
        </div>
      )}
    </div>
  );
}
