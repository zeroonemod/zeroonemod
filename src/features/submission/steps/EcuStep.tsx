import { TextArea, TextInput } from '@/components/ui/FormControls';
import type { StepProps } from '@/features/submission/types';

export function EcuStep({ form, errors, update }: StepProps) {
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
