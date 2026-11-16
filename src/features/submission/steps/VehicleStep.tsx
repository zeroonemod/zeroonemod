import { TextInput } from '@/components/ui/FormField';
import { SelectInput } from '@/components/ui/Select';
import { EcuStep } from '@/features/submission/steps/EcuStep';
import { FUEL_OPTIONS, type StepProps, type WizardForm } from '@/features/submission/types';
import type { PreviousVehicle } from '@/features/submission/usePreviousVehicles';

interface VehicleStepProps extends StepProps {
  previousVehicles?: PreviousVehicle[];
  onApplyVehicle?: (fields: Partial<WizardForm>) => void;
}

export function VehicleStep({ previousVehicles = [], onApplyVehicle, ...props }: VehicleStepProps) {
  const { form, errors, update } = props;

  return (
    <div className="flex flex-col gap-8">
      {previousVehicles.length > 0 && onApplyVehicle && (
        <SelectInput
          id="previousVehicle"
          label="Use vehicle from a previous job"
          optional
          placeholder="Select a vehicle"
          defaultValue=""
          options={previousVehicles.map((vehicle) => ({ value: vehicle.id, label: vehicle.label }))}
          onChange={(event) => {
            const vehicle = previousVehicles.find((item) => item.id === event.target.value);
            if (vehicle) onApplyVehicle(vehicle.fields);
          }}
          hint="Fills in the vehicle and ECU details below. You can still edit them."
        />
      )}
      <div className="grid gap-6 sm:grid-cols-2">
        <TextInput
          id="make"
          label="Make"
          placeholder="e.g. Volkswagen"
          value={form.make}
          onChange={(event) => update('make', event.target.value)}
          error={errors.make}
          autoComplete="off"
        />
        <TextInput
          id="model"
          label="Model"
          placeholder="e.g. Golf"
          value={form.model}
          onChange={(event) => update('model', event.target.value)}
          error={errors.model}
          autoComplete="off"
        />
        <TextInput
          id="year"
          label="Year"
          inputMode="numeric"
          placeholder="e.g. 2018"
          value={form.year}
          onChange={(event) => update('year', event.target.value)}
          error={errors.year}
        />
        <TextInput
          id="engine"
          label="Engine"
          placeholder="e.g. 2.0 TDI, code CUNA"
          value={form.engine}
          onChange={(event) => update('engine', event.target.value)}
          error={errors.engine}
          autoComplete="off"
        />
        <SelectInput
          id="fuelType"
          label="Fuel type"
          placeholder="Select fuel type"
          options={FUEL_OPTIONS.map((fuel) => ({ value: fuel, label: fuel }))}
          value={form.fuelType}
          onChange={(event) => update('fuelType', event.target.value)}
          error={errors.fuelType}
        />
        <TextInput
          id="vin"
          label="VIN"
          placeholder="17 characters"
          maxLength={17}
          value={form.vin}
          onChange={(event) => update('vin', event.target.value.toUpperCase())}
          error={errors.vin}
          hint="Found on the vehicle registration document or the windscreen."
          autoCapitalize="characters"
          spellCheck={false}
          className="font-mono uppercase tracking-wider"
        />
      </div>

      <div className="flex flex-col gap-6 border-t border-white/[0.08] pt-8">
        <div>
          <p className="text-sm font-semibold text-neutral-200">ECU/TCU details (optional if unknown)</p>
        </div>
        <EcuStep {...props} />
      </div>
    </div>
  );
}
