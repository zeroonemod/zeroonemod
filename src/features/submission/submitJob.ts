import { supabase } from '@/lib/supabase';
import type { WizardForm } from '@/features/submission/types';
import { JOB_FILES_BUCKET as BUCKET, toStorageFileName } from '@/lib/storagePaths';

export interface SubmitResult {
  reference: string;
  accountStatus: 'created' | 'exists' | 'invited' | 'unavailable';
}

function safeStorageName(index: number, name: string): string {
  return `${String(index + 1).padStart(2, '0')}-${toStorageFileName(name)}`;
}

function buildPayload(form: WizardForm, draftId: string, files: { storageName: string; originalName: string; sizeBytes: number; mimeType: string }[]) {
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

export async function submitJob(form: WizardForm, files: File[]): Promise<SubmitResult> {
  const draftId = crypto.randomUUID();

  const uploaded = [];
  for (const [index, file] of files.entries()) {
    const storageName = safeStorageName(index, file.name);
    const { error } = await supabase.storage
      .from(BUCKET)
      .upload(`pending/${draftId}/${storageName}`, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
    if (error) throw new Error('upload_failed');
    uploaded.push({
      storageName,
      originalName: file.name,
      sizeBytes: file.size,
      mimeType: file.type || 'application/octet-stream',
    });
  }

  const { data, error } = await supabase.functions.invoke('submit-job', {
    body: buildPayload(form, draftId, uploaded),
  });
  if (error) throw new Error('submit_failed');

  const result = data as Partial<SubmitResult> | null;
  if (!result || typeof result.reference !== 'string' || typeof result.accountStatus !== 'string') {
    throw new Error('submit_failed');
  }

  if (form.password && result.accountStatus === 'created') {
    await supabase.auth.signInWithPassword({ email: form.email.trim().toLowerCase(), password: form.password });
  }

  return { reference: result.reference, accountStatus: result.accountStatus as SubmitResult['accountStatus'] };
}
