import { callFunction } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { JOB_FILES_BUCKET as BUCKET, toStorageFileName } from '@/lib/storagePaths';
import type { WizardForm } from '@/features/submission/types';

export type AccountStatus = 'signed_in' | 'created' | 'exists' | 'invited' | 'unavailable';

export interface SubmitResult {
  reference: string;
  accountStatus: AccountStatus;
}

interface UploadedFile {
  storageName: string;
  originalName: string;
  sizeBytes: number;
  mimeType: string;
}

function safeStorageName(index: number, name: string): string {
  return `${String(index + 1).padStart(2, '0')}-${toStorageFileName(name)}`;
}

function buildPayload(form: WizardForm, draftId: string, files: UploadedFile[]) {
  return {
    draftId,
    files,
    fileType: form.fileType,
    requestedService: form.requestedService,
    serviceComments: form.serviceComments.trim(),
    vehicle: {
      make: form.make.trim(),
      model: form.model.trim(),
      year: Number(form.year),
      engine: form.engine.trim(),
      fuelType: form.fuelType,
      vin: form.vin.trim().toUpperCase(),
    },
    ecu: {
      manufacturer: form.manufacturer.trim(),
      hardwareNumber: form.hardwareNumber.trim(),
      softwareNumber: form.softwareNumber.trim(),
      identificationNumbers: form.identificationNumbers.trim(),
    },
    customer: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      country: form.country.trim(),
      customerType: form.customerType,
      companyName: form.companyName.trim(),
      phone: form.phone.trim(),
    },
    privacyConsent: form.privacyConsent,
    password: form.password || undefined,
    website: form.website,
  };
}

type Progress = (done: number, total: number) => void;

/** Uploads the files into a private pending folder. The server moves them into the job folder. */
async function uploadToPending(files: File[], onProgress?: Progress): Promise<{ draftId: string; uploaded: UploadedFile[] }> {
  const draftId = crypto.randomUUID();
  const uploaded: UploadedFile[] = [];
  for (const [index, file] of files.entries()) {
    onProgress?.(index, files.length);
    const storageName = safeStorageName(index, file.name);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`pending/${draftId}/${storageName}`, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
    if (error) throw new Error(`The file ${file.name} could not be uploaded. Please check your connection and try again.`);
    uploaded.push({ storageName, originalName: file.name, sizeBytes: file.size, mimeType: file.type || 'application/octet-stream' });
  }
  onProgress?.(files.length, files.length);
  return { draftId, uploaded };
}

export interface GuestDetails {
  email: string;
  phone: string;
  notes: string;
  privacyConsent: boolean;
  website: string;
}

/** Guest request: no account, only contact details and files. Returns the job reference. */
export async function submitGuest(details: GuestDetails, files: File[], onProgress?: Progress): Promise<string> {
  const { draftId, uploaded } = await uploadToPending(files, onProgress);
  const result = await callFunction<{ reference?: string }>('submit-guest', {
    draftId,
    files: uploaded,
    email: details.email.trim(),
    phone: details.phone.trim(),
    notes: details.notes.trim(),
    privacyConsent: details.privacyConsent,
    website: details.website,
  });
  if (!result || typeof result.reference !== 'string') {
    throw new Error('We could not send your file. Please try again.');
  }
  return result.reference;
}

/** Uploads the files into a private pending folder, then asks the server to create the job. */
export async function submitJob(form: WizardForm, files: File[], onProgress?: Progress): Promise<SubmitResult> {
  const { draftId, uploaded } = await uploadToPending(files, onProgress);

  const result = await callFunction<Partial<SubmitResult>>('submit-job', buildPayload(form, draftId, uploaded));
  if (!result || typeof result.reference !== 'string' || typeof result.accountStatus !== 'string') {
    throw new Error('We could not send your submission. Your details are still here, so please try again.');
  }

  if (form.password && result.accountStatus === 'created') {
    await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
  }

  return { reference: result.reference, accountStatus: result.accountStatus as AccountStatus };
}
