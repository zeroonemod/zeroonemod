import { Camera, X } from 'lucide-react';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { UploadDropzone } from '@/components/ui/UploadDropzone';
import { formatFileSize } from '@/lib/uploadLimits';
import { MAX_HARDWARE_PHOTOS, useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';
import type { StepProps } from '@/features/submission/types';

export function EcuStep({ form, errors, update }: StepProps) {
  const { photos, addPhotos, removePhoto } = useSubmissionFiles();

  return (
    <div className="grid gap-6 sm:grid-cols-2">
      <div className="sm:col-span-2">
        <TextInput
          id="manufacturer"
          label="ECU / TCU manufacturer"
          placeholder="e.g. Bosch, Continental, Delphi"
          value={form.manufacturer}
          onChange={(event) => update('manufacturer', event.target.value)}
          error={errors.manufacturer}
          autoComplete="off"
        />
      </div>
      <TextInput
        id="hardwareNumber"
        label="Hardware number"
        value={form.hardwareNumber}
        onChange={(event) => update('hardwareNumber', event.target.value)}
        error={errors.hardwareNumber}
        className="font-mono"
        spellCheck={false}
        autoComplete="off"
      />
      <TextInput
        id="softwareNumber"
        label="Software number"
        value={form.softwareNumber}
        onChange={(event) => update('softwareNumber', event.target.value)}
        error={errors.softwareNumber}
        className="font-mono"
        spellCheck={false}
        autoComplete="off"
      />

      <div className="flex flex-col gap-3 sm:col-span-2">
        <p className="text-sm font-medium text-neutral-200">
          Hardware photo <span className="ml-1.5 font-normal text-neutral-400">(optional)</span>
        </p>
        {photos.length > 0 && (
          <ul className="flex flex-col divide-y divide-white/[0.06] overflow-hidden rounded-xl border border-white/10 bg-surface-sunken">
            {photos.map((photo, index) => (
              <li key={`${index}-${photo.name}`} className="flex items-center justify-between gap-4 px-4 py-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-white">{photo.name}</p>
                  <p className="text-xs text-neutral-400">{formatFileSize(photo.size)}</p>
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
            title={photos.length > 0 ? 'Add another photo' : 'Upload hardware photo'}
            description="Take a clear photo of the ECU/TCU label where the hardware and software numbers (serial numbers) are printed."
            error={errors.photos}
          />
        )}
      </div>

      <div className="sm:col-span-2">
        <TextArea
          id="identificationNumbers"
          label="ECU / TCU identification numbers"
          optional
          hint="Any other identification numbers printed on the unit or shown by your diagnostic tool."
          value={form.identificationNumbers}
          onChange={(event) => update('identificationNumbers', event.target.value)}
          error={errors.identificationNumbers}
          className="min-h-24 font-mono text-xs"
          spellCheck={false}
        />
      </div>
    </div>
  );
}
