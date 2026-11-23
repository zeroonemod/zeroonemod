// Steps 1 and 2 of the submission form are the same for customers, partners and guests.
// This module validates them once and maps them to job columns.
import { oneOf, optionalText, text } from './http.ts';
import { BUCKET, type UploadedFile } from './files.ts';
import type { AdminClient } from './supabase.ts';

const FILE_TYPES = ['ECU', 'TCU'] as const;
const SERVICES = ['stage1_calibration', 'original_restoration', 'decoding', 'other_modification', 'not_sure'] as const;
const FUEL_TYPES = ['Petrol', 'Diesel', 'Hybrid', 'Other'] as const;
const GEARBOX_TYPES = ['manual', 'automatic', 'dual_clutch', 'cvt', 'other'] as const;
const POWER_UNITS = ['HP', 'kW'] as const;
const VIN = /^[A-HJ-NPR-Z0-9]{17}$/;
const STORAGE_NAME = /^[A-Za-z0-9._-]{1,120}$/;
const MAX_PHOTOS = 5;

export const SERVICE_LABELS: Record<string, string> = {
  stage1_calibration: 'Stage 1 calibration',
  original_restoration: 'Original file restoration',
  decoding: 'Decoding (DPF, AdBlue, etc.)',
  other_modification: 'Other supported modification',
  not_sure: 'Not sure',
};

export const GEARBOX_LABELS: Record<string, string> = {
  manual: 'Manual',
  automatic: 'Automatic',
  dual_clutch: 'Dual-clutch (DSG/DCT)',
  cvt: 'CVT',
  other: 'Other',
};

/** Job columns from steps 1 and 2 (file, service, vehicle, ECU/TCU). */
export interface JobDetails {
  file_type: string;
  requested_service: string;
  service_comments: string | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_engine: string;
  vehicle_fuel_type: string;
  vehicle_vin: string;
  vehicle_power: number | null;
  vehicle_power_unit: string | null;
  vehicle_torque_nm: number | null;
  gearbox_type: string;
  file_previously_modified: boolean;
  ecu_manufacturer: string | null;
  ecu_hardware_number: string | null;
  ecu_software_number: string | null;
  ecu_identification_numbers: string | null;
}

/** Returns the validated details, or null when anything is missing or invalid. */
export function parseJobDetails(body: Record<string, unknown>): JobDetails | null {
  const vehicle = (body.vehicle ?? {}) as Record<string, unknown>;
  const ecu = (body.ecu ?? {}) as Record<string, unknown>;

  const fileType = oneOf(body.fileType, FILE_TYPES);
  const service = oneOf(body.requestedService, SERVICES);
  const fuel = oneOf(vehicle.fuelType, FUEL_TYPES);
  const gearbox = oneOf(vehicle.gearboxType, GEARBOX_TYPES);
  const make = text(vehicle.make, 60);
  const model = text(vehicle.model, 60);
  const engine = text(vehicle.engine, 80);
  const year = Number(vehicle.year);
  const vin = typeof vehicle.vin === 'string' ? vehicle.vin.trim().toUpperCase() : '';
  const comments = optionalText(body.serviceComments, 1000);
  const manufacturer = optionalText(ecu.manufacturer, 80);
  const hardware = optionalText(ecu.hardwareNumber, 80);
  const software = optionalText(ecu.softwareNumber, 80);
  const identification = optionalText(ecu.identificationNumbers, 300);

  // Power (with its unit) and torque are optional; checked only when given.
  const powerRaw = vehicle.power;
  const power = powerRaw === null || powerRaw === undefined || powerRaw === '' ? null : Number(powerRaw);
  const powerUnit = power === null ? null : oneOf(vehicle.powerUnit, POWER_UNITS);
  const torqueRaw = vehicle.torque;
  const torque = torqueRaw === null || torqueRaw === undefined || torqueRaw === '' ? null : Number(torqueRaw);
  const modified = vehicle.previouslyModified;

  const currentYear = new Date().getFullYear();
  const invalid =
    !fileType || !service || !fuel || !gearbox || !make || !model || !engine || !VIN.test(vin) ||
    !Number.isInteger(year) || year < 1950 || year > currentYear + 1 ||
    comments === undefined || manufacturer === undefined || hardware === undefined || software === undefined || identification === undefined ||
    (power !== null && (!Number.isFinite(power) || power <= 0 || power > 3000 || !powerUnit)) ||
    (torque !== null && (!Number.isInteger(torque) || torque <= 0 || torque > 5000)) ||
    typeof modified !== 'boolean';
  if (invalid) return null;

  return {
    file_type: fileType,
    requested_service: service,
    service_comments: comments,
    vehicle_make: make,
    vehicle_model: model,
    vehicle_year: year,
    vehicle_engine: engine,
    vehicle_fuel_type: fuel,
    vehicle_vin: vin,
    vehicle_power: power === null ? null : Math.round(power * 10) / 10,
    vehicle_power_unit: powerUnit,
    vehicle_torque_nm: torque,
    gearbox_type: gearbox,
    file_previously_modified: modified as boolean,
    ecu_manufacturer: manufacturer,
    ecu_hardware_number: hardware,
    ecu_software_number: software,
    ecu_identification_numbers: identification,
  };
}

/** Optional photos of the ECU/TCU label, uploaded like the files. Images only, at most 5. */
/** At least one photo of the ECU/TCU label is required (it replaces typing the numbers by hand). */
export function parsePhotos(value: unknown): UploadedFile[] | null {
  if (!Array.isArray(value) || value.length === 0 || value.length > MAX_PHOTOS) return null;
  const photos: UploadedFile[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) return null;
    const record = item as Record<string, unknown>;
    const originalName = text(record.originalName, 200);
    const mimeType = typeof record.mimeType === 'string' ? record.mimeType.slice(0, 120) : '';
    if (typeof record.storageName !== 'string' || !STORAGE_NAME.test(record.storageName) || !record.storageName.startsWith('photo-')) return null;
    if (!originalName || typeof record.sizeBytes !== 'number' || record.sizeBytes < 0 || !mimeType.startsWith('image/')) return null;
    photos.push({ storageName: record.storageName, originalName, sizeBytes: Math.round(record.sizeBytes), mimeType });
  }
  return photos;
}

/** Moves the photos into <reference>/photos/ and records them as job files of kind 'photo'. */
export async function attachPhotos(admin: AdminClient, jobId: string, reference: string, draftId: string, photos: UploadedFile[]) {
  if (photos.length === 0) return;
  for (const photo of photos) {
    const { error } = await admin.storage.from(BUCKET).move(`pending/${draftId}/${photo.storageName}`, `${reference}/photos/${photo.storageName}`);
    if (error) throw error;
  }
  const { error } = await admin.from('job_files').insert(
    photos.map((photo) => ({
      job_id: jobId,
      kind: 'photo',
      file_name: photo.originalName,
      storage_path: `${reference}/photos/${photo.storageName}`,
      size_bytes: photo.sizeBytes,
      mime_type: photo.mimeType,
    })),
  );
  if (error) throw error;
}

/** Lines used in the notification emails. */
export function vehicleSummary(details: JobDetails): [string, string][] {
  const power = details.vehicle_power ? `${details.vehicle_power} ${details.vehicle_power_unit}` : null;
  const torque = details.vehicle_torque_nm ? `${details.vehicle_torque_nm} Nm` : null;
  return [
    ['Service', `${details.file_type} · ${SERVICE_LABELS[details.requested_service]}`],
    ['Vehicle', `${details.vehicle_year} ${details.vehicle_make} ${details.vehicle_model} · ${details.vehicle_engine} · ${details.vehicle_fuel_type}`],
    ['Power / torque', [power, torque].filter(Boolean).join(' · ') || '-'],
    ['Gearbox', GEARBOX_LABELS[details.gearbox_type]],
    ['Previously modified', details.file_previously_modified ? 'Yes' : 'No'],
    ['VIN', details.vehicle_vin],
  ];
}
