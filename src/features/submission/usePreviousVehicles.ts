import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import type { WizardForm } from '@/features/submission/types';

export type VehicleFields = Pick<
  WizardForm,
  'make' | 'model' | 'year' | 'engine' | 'fuelType' | 'vin' | 'power' | 'powerUnit' | 'torque' | 'gearboxType' | 'manufacturer' | 'hardwareNumber' | 'softwareNumber' | 'identificationNumbers'
>;

export interface PreviousVehicle {
  id: string;
  label: string;
  fields: VehicleFields;
}

/** Vehicles from the signed-in customer's earlier jobs, newest first, one entry per VIN. */
export function usePreviousVehicles(enabled: boolean): PreviousVehicle[] {
  const [vehicles, setVehicles] = useState<PreviousVehicle[]>([]);

  useEffect(() => {
    if (!enabled) {
      setVehicles([]);
      return;
    }
    let active = true;
    supabase
      .from('jobs')
      .select('id, reference, vehicle_make, vehicle_model, vehicle_year, vehicle_engine, vehicle_fuel_type, vehicle_vin, vehicle_power, vehicle_power_unit, vehicle_torque_nm, gearbox_type, ecu_manufacturer, ecu_hardware_number, ecu_software_number, ecu_identification_numbers')
      .order('created_at', { ascending: false })
      .limit(50)
      .then(({ data }) => {
        if (!active || !Array.isArray(data)) return;
        const seen = new Set<string>();
        const list: PreviousVehicle[] = [];
        for (const job of data) {
          if (!job.vehicle_vin || job.vehicle_vin === 'DELETED' || seen.has(job.vehicle_vin)) continue;
          seen.add(job.vehicle_vin);
          list.push({
            id: job.id,
            label: `${job.vehicle_year} ${job.vehicle_make} ${job.vehicle_model} · ${job.vehicle_vin} (${job.reference})`,
            fields: {
              make: job.vehicle_make,
              model: job.vehicle_model,
              year: String(job.vehicle_year),
              engine: job.vehicle_engine ?? '',
              fuelType: job.vehicle_fuel_type ?? '',
              vin: job.vehicle_vin,
              power: job.vehicle_power ? String(job.vehicle_power) : '',
              powerUnit: job.vehicle_power_unit === 'kW' ? 'kW' : 'HP',
              torque: job.vehicle_torque_nm ? String(job.vehicle_torque_nm) : '',
              gearboxType: job.gearbox_type ?? '',
              manufacturer: job.ecu_manufacturer ?? '',
              hardwareNumber: job.ecu_hardware_number ?? '',
              softwareNumber: job.ecu_software_number ?? '',
              identificationNumbers: job.ecu_identification_numbers ?? '',
            },
          });
        }
        setVehicles(list);
      });
    return () => {
      active = false;
    };
  }, [enabled]);

  return vehicles;
}
