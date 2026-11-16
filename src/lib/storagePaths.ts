export const JOB_FILES_BUCKET = 'job-files';

export function toStorageFileName(name: string): string {
  return name.replace(/[^A-Za-z0-9._-]/g, '_').slice(-80) || 'file';
}
