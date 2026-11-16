import { text } from './http.ts';
import type { AdminClient } from './supabase.ts';

export const BUCKET = 'job-files';
const MAX_FILES = 20;
const STORAGE_NAME = /^[A-Za-z0-9._-]{1,120}$/;
export const DRAFT_ID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export interface UploadedFile {
  storageName: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

/** Validates the file list sent by the browser after it uploaded into pending/<draftId>/. */
export function parseFiles(value: unknown): UploadedFile[] | null {
  if (!Array.isArray(value) || value.length < 1 || value.length > MAX_FILES) return null;
  const files: UploadedFile[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const record = item as Record<string, unknown>;
    const originalName = text(record.originalName, 200);
    if (typeof record.storageName !== 'string' || !STORAGE_NAME.test(record.storageName)) return null;
    if (!originalName || typeof record.sizeBytes !== 'number' || record.sizeBytes < 0) return null;
    files.push({
      storageName: record.storageName,
      originalName,
      sizeBytes: Math.round(record.sizeBytes),
      mimeType: typeof record.mimeType === 'string' && record.mimeType ? record.mimeType.slice(0, 120) : 'application/octet-stream',
    });
  }
  return new Set(files.map((f) => f.storageName)).size === files.length ? files : null;
}

/** True when every listed file is really in pending/<draftId>/. */
export async function pendingFilesPresent(admin: AdminClient, draftId: string, files: UploadedFile[]): Promise<boolean> {
  const { data, error } = await admin.storage.from(BUCKET).list(`pending/${draftId}`, { limit: 100 });
  if (error) throw error;
  const received = new Set((data ?? []).map((item) => item.name));
  return files.every((file) => received.has(file.storageName));
}

/** Moves the files into <reference>/original/ and records them on the job. */
export async function attachOriginals(admin: AdminClient, jobId: string, reference: string, draftId: string, files: UploadedFile[]) {
  for (const file of files) {
    const { error } = await admin.storage.from(BUCKET).move(`pending/${draftId}/${file.storageName}`, `${reference}/original/${file.storageName}`);
    if (error) throw error;
  }
  const { error } = await admin.from('job_files').insert(
    files.map((file) => ({
      job_id: jobId,
      kind: 'original',
      file_name: file.originalName,
      storage_path: `${reference}/original/${file.storageName}`,
      size_bytes: file.sizeBytes,
      mime_type: file.mimeType,
    })),
  );
  if (error) throw error;
}
