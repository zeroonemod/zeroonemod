export const JOB_STATUSES = [
  'Submitted',
  'Under Review',
  'Awaiting Information',
  'Quotation Sent',
  'Awaiting Payment',
  'In Progress',
  'Completed',
  'Delivered',
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const SERVICE_LABELS: Record<string, string> = {
  stage1_calibration: 'Stage 1 calibration',
  original_restoration: 'Original restoration',
  decoding: 'Decoding',
  other_modification: 'Other modification',
  not_sure: 'Not sure yet',
};

export const PAYMENT_METHODS = [
  { value: 'card_link', label: 'Card link' },
  { value: 'bank_transfer', label: 'Bank transfer' },
  { value: 'partner_arrangement', label: 'Partner arrangement' },
  { value: 'other', label: 'Other' },
] as const;

export type PaymentMethod = (typeof PAYMENT_METHODS)[number]['value'];

export const PAYMENT_METHOD_LABELS: Record<string, string> = Object.fromEntries(PAYMENT_METHODS.map((m) => [m.value, m.label]));

export interface JobRow {
  id: string;
  reference: string;
  user_id: string | null;
  status: JobStatus;
  file_type: 'ECU' | 'TCU';
  requested_service: string;
  service_comments: string | null;
  customer_type: 'individual' | 'workshop';
  customer_first_name: string;
  customer_last_name: string;
  customer_email: string;
  customer_country: string;
  customer_phone: string | null;
  company_name: string | null;
  vehicle_make: string;
  vehicle_model: string;
  vehicle_year: number;
  vehicle_engine: string;
  vehicle_fuel_type: string;
  vehicle_vin: string;
  ecu_manufacturer: string | null;
  ecu_hardware_number: string | null;
  ecu_software_number: string | null;
  ecu_identification_numbers: string | null;
  quote_amount: number | null;
  quote_currency: string;
  quote_notes: string | null;
  quoted_at: string | null;
  payment_link: string | null;
  payment_status: 'not_paid' | 'paid';
  payment_method: PaymentMethod | null;
  paid_at: string | null;
  delivered_at: string | null;
  files_deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export const JOB_COLUMNS =
  'id, reference, user_id, status, file_type, requested_service, service_comments, customer_type, customer_first_name, customer_last_name, customer_email, customer_country, customer_phone, company_name, vehicle_make, vehicle_model, vehicle_year, vehicle_engine, vehicle_fuel_type, vehicle_vin, ecu_manufacturer, ecu_hardware_number, ecu_software_number, ecu_identification_numbers, quote_amount, quote_currency, quote_notes, quoted_at, payment_link, payment_status, payment_method, paid_at, delivered_at, files_deleted_at, created_at, updated_at';

export interface JobFileRow {
  id: string;
  job_id: string;
  kind: 'original' | 'additional' | 'completed';
  file_name: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
}

export const FILE_COLUMNS = 'id, job_id, kind, file_name, storage_path, size_bytes, created_at';

export interface JobMessageRow {
  id: string;
  job_id: string;
  sender_role: 'customer' | 'admin';
  body: string;
  customer_read_at: string | null;
  admin_read_at: string | null;
  created_at: string;
}

export const MESSAGE_COLUMNS = 'id, job_id, sender_role, body, customer_read_at, admin_read_at, created_at';

export interface JobEventRow {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  job_id: string;
  amount: number;
  currency: string;
  method: PaymentMethod;
  status: string;
  reference_note: string | null;
  paid_at: string;
  created_at: string;
}

export const PAYMENT_COLUMNS = 'id, job_id, amount, currency, method, status, reference_note, paid_at, created_at';

export function vehicleLabel(job: Pick<JobRow, 'vehicle_year' | 'vehicle_make' | 'vehicle_model'>): string {
  return `${job.vehicle_year} ${job.vehicle_make} ${job.vehicle_model}`;
}

export function customerName(job: Pick<JobRow, 'customer_first_name' | 'customer_last_name'>): string {
  return `${job.customer_first_name} ${job.customer_last_name}`;
}
