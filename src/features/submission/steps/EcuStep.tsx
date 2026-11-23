import { Camera, X } from 'lucide-react';
import { TextInput } from '@/components/ui/FormField';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { formatFileSize } from '@/lib/uploadLimits';
import { MAX_HARDWARE_PHOTOS, useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import type { StepProps } from '@/features/submission/types';

/**
 * ECU/TCU details: photos of the unit's label are required and replace typing the hardware,
 * software and identification numbers by hand. The manufacturer stays optional.
 */
export function EcuStep({ form, errors, update }: StepProps) {
  const { photos, addPhotos, removePhoto } = useSubmissionFiles();

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3">
        <div className="flex flex-col gap-1">
          <p className="text-sm font-medium text-neutral-200">ECU / TCU label photos</p>
          <p className="text-xs leading-relaxed text-neutral-400">
            Add at least one clear photo of the label with the hardware and software numbers (serial numbers). You can add up to{' '}
            {MAX_HARDWARE_PHOTOS} photos, for example a second one with the identification number.
          </p>
        </div>
        {photos.length > 0 && (
          <ul className="flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-surface-sunken">
            {photos.map((photo, index) => (
              <li key={`${index}-${photo.name}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="flex min-w-0 items-center gap-3">
                  <Camera className="h-4 w-4 shrink-0 text-brand-500" aria-hidden="true" />
                  <div className="min-w-0">
                    <p className="truncate text-sm text-white">{photo.name}</p>
                    <p className="text-xs text-neutral-400">{formatFileSize(photo.size)}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removePhoto(index)}
                  aria-label={`Remove ${photo.name}`}
                  className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-neutral-400 transition-colors duration-200 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" aria-hidden="true" />
                </button>
              </li>
            ))}
          </ul>
        )}
        {photos.length < MAX_HARDWARE_PHOTOS && (
          <UploadDropzone
            compact
            accept="image/*"
            icon={<Camera className="h-5 w-5" aria-hidden="true" />}
            onFilesSelected={addPhotos}
            title={photos.length > 0 ? 'Add another photo' : 'Upload label photo'}
            description={photos.length > 0 ? 'Optional: the identification number or another side of the label.' : 'Photo of the ECU/TCU label where the serial numbers are printed.'}
            error={errors.photos}
          />
        )}
      </div>

      <TextInput
        id="manufacturer"
        label="ECU / TCU manufacturer"
        optional
        placeholder="e.g. Bosch, Continental, Delphi"
        value={form.manufacturer}
        onChange={(event) => update('manufacturer', event.target.value)}
        error={errors.manufacturer}
        autoComplete="off"
      />
    </div>
  );
}
