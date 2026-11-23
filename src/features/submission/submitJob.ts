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

type Progress = (done: number, total: number) => void;

function safeStorageName(prefix: string, index: number, name: string): string {
  return `${prefix}${String(index + 1).padStart(2, '0')}-${toStorageFileName(name)}`;
}

/** Steps 1 and 2: the same for customers, partners and guests. */
function jobDetailsPayload(form: WizardForm) {
  const power = form.power.trim().replace(',', '.');
  return {
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
      power: power ? Number(power) : null,
      powerUnit: power ? form.powerUnit : null,
      torque: form.torque.trim() ? Number(form.torque.trim()) : null,
      gearboxType: form.gearboxType,
      previouslyModified: form.previouslyModified === 'yes',
    },
    ecu: {
      manufacturer: form.manufacturer.trim(),
      hardwareNumber: form.hardwareNumber.trim(),
      softwareNumber: form.softwareNumber.trim(),
      identificationNumbers: form.identificationNumbers.trim(),
    },
    privacyConsent: form.privacyConsent,
    website: form.website,
  };
}

/**
 * Uploads the original files and the hardware photos into a private pending folder.
 * The server checks them and moves them into the job folder (original/ and photos/).
 */
async function uploadToPending(files: File[], photos: File[], onProgress?: Progress) {
  const draftId = crypto.randomUUID();
  const all = [...files.map((file, i) => ({ file, name: safeStorageName('', i, file.name), photo: false })), ...photos.map((file, i) => ({ file, name: safeStorageName('photo-', i, file.name), photo: true }))];
  const uploaded: UploadedFile[] = [];
  const uploadedPhotos: UploadedFile[] = [];
  for (const [index, item] of all.entries()) {
    onProgress?.(index, all.length);
    const contentType = item.file.type || 'application/octet-stream';
    const { error } = await supabase.storage.from(BUCKET).upload(`pending/${draftId}/${item.name}`, item.file, { upsert: false, contentType });
    if (error) throw new Error(`The file ${item.file.name} could not be uploaded. Please check your connection and try again.`);
    (item.photo ? uploadedPhotos : uploaded).push({ storageName: item.name, originalName: item.file.name, sizeBytes: item.file.size, mimeType: contentType });
  }
  onProgress?.(all.length, all.length);
  return { draftId, uploaded, uploadedPhotos };
}

/** Guest request: same steps 1 and 2, contact by email and/or phone, no account. Returns the reference. */
export async function submitGuest(form: WizardForm, files: File[], photos: File[], onProgress?: Progress): Promise<string> {
  const { draftId, uploaded, uploadedPhotos } = await uploadToPending(files, photos, onProgress);
  const result = await callFunction<{ reference?: string }>('submit-guest', {
    ...jobDetailsPayload(form),
    draftId,
    files: uploaded,
    photos: uploadedPhotos,
    email: form.email.trim(),
    phone: form.phone.trim(),
  });
  if (!result || typeof result.reference !== 'string') {
    throw new Error('We could not send your file. Please try again.');
  }
  return result.reference;
}

/** Customer or partner submission; creates or links an account for visitors on the account path. */
export async function submitJob(form: WizardForm, files: File[], photos: File[], onProgress?: Progress): Promise<SubmitResult> {
  const { draftId, uploaded, uploadedPhotos } = await uploadToPending(files, photos, onProgress);

  const result = await callFunction<Partial<SubmitResult>>('submit-job', {
    ...jobDetailsPayload(form),
    draftId,
    files: uploaded,
    photos: uploadedPhotos,
    customer: {
      firstName: form.firstName.trim(),
      lastName: form.lastName.trim(),
      email: form.email.trim().toLowerCase(),
      country: form.country.trim(),
      customerType: form.customerType,
      companyName: form.companyName.trim(),
      phone: form.phone.trim(),
    },
    password: form.password || undefined,
  });
  if (!result || typeof result.reference !== 'string' || typeof result.accountStatus !== 'string') {
    throw new Error('We could not send your submission. Your details are still here, so please try again.');
  }

  if (form.password && result.accountStatus === 'created') {
    await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
  }

  return { reference: result.reference, accountStatus: result.accountStatus as AccountStatus };
}
