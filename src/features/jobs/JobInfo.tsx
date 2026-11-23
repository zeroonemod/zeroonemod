import type { ReactNode } from 'react';
import { formatDate } from '@/features/jobs/jobFormat';
import { GEARBOX_LABELS, SERVICE_LABELS, vehicleLabel, type JobRow } from '@/features/jobs/jobTypes';

export function Detail({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="flex min-w-0 flex-col gap-1">
      <dt className="text-xs uppercase tracking-wider text-neutral-500">{label}</dt>
      <dd className={`break-words text-neutral-100 ${mono ? 'font-mono text-[13px]' : ''}`}>{value || '-'}</dd>
    </div>
  );
}

export function DetailGrid({ children }: { children: ReactNode }) {
  return <dl className="grid gap-4 text-sm sm:grid-cols-2">{children}</dl>;
}

/** Vehicle and ECU/TCU details as submitted. */
export function JobVehicleDetails({ job }: { job: JobRow }) {
  return (
    <DetailGrid>
      <Detail label="Submitted" value={formatDate(job.created_at)} />
      <Detail label="Service" value={`${job.file_type} · ${SERVICE_LABELS[job.requested_service] ?? job.requested_service}`} />
      <Detail label="Vehicle" value={vehicleLabel(job)} />
      <Detail label="Engine" value={job.vehicle_engine} />
      <Detail label="Fuel type" value={job.vehicle_fuel_type} />
      <Detail label="VIN" value={job.vehicle_vin} mono />
      <Detail label="Power" value={job.vehicle_power ? `${job.vehicle_power} ${job.vehicle_power_unit ?? ''}` : null} />
      <Detail label="Torque" value={job.vehicle_torque_nm ? `${job.vehicle_torque_nm} Nm` : null} />
      <Detail label="Gearbox" value={job.gearbox_type ? GEARBOX_LABELS[job.gearbox_type] ?? job.gearbox_type : null} />
      <Detail
        label="File modified before"
        value={job.file_previously_modified === null ? null : job.file_previously_modified ? 'Yes' : 'No'}
      />
      <Detail label={`${job.file_type} manufacturer`} value={job.ecu_manufacturer} />
      <Detail label="Hardware number" value={job.ecu_hardware_number} mono />
      <Detail label="Software number" value={job.ecu_software_number} mono />
      <Detail label="Identification numbers" value={job.ecu_identification_numbers} mono />
    </DetailGrid>
  );
}
