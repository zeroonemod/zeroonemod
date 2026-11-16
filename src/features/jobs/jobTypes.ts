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
  vehicle_engine: string | null;
  vehicle_fuel_type: string | null;
  vehicle_vin: string | null;
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
  paid_at: string | null;
  created_at: string;
}

export const JOB_COLUMNS =
  'id, reference, user_id, status, file_type, requested_service, service_comments, customer_type, customer_first_name, customer_last_name, customer_email, customer_country, customer_phone, company_name, vehicle_make, vehicle_model, vehicle_year, vehicle_engine, vehicle_fuel_type, vehicle_vin, ecu_manufacturer, ecu_hardware_number, ecu_software_number, ecu_identification_numbers, quote_amount, quote_currency, quote_notes, quoted_at, payment_link, payment_status, paid_at, created_at';

export interface JobFileRow {
  id: string;
  job_id: string;
  kind: 'original' | 'additional' | 'completed';
  file_name: string;
  storage_path: string;
  size_bytes: number;
  created_at: string;
}

export interface JobMessageRow {
  id: string;
  job_id: string;
  sender_role: 'customer' | 'admin';
  body: string;
  customer_read_at: string | null;
  admin_read_at: string | null;
  created_at: string;
}

export interface JobEventRow {
  id: string;
  action: string;
  details: Record<string, unknown>;
  created_at: string;
}

export interface PaymentRow {
  id: string;
  amount: number;
  currency: string;
  method: 'card_link' | 'bank_transfer' | 'partner_arrangement' | 'other';
  reference_note: string | null;
  paid_at: string;
}
