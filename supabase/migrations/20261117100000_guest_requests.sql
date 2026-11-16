/*
# Guest requests

Plain-English summary
- Visitors can send a file without an account, leaving only an email and/or a phone number and a short note.
- Guest requests live in the same jobs table (same ZOM-000001 numbering) with job_type = 'guest'.
  They are never linked to a user account, so only the admin can see them (existing policies).
- The admin can later convert a guest request into a normal customer job by filling in the missing
  customer, vehicle and ECU/TCU details. That sets job_type back to 'customer'.

Rules enforced by the database
- A normal customer job must have all the details it had before (name, email, country, vehicle, service).
- A guest request must have at least an email or a phone number.
*/

ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS job_type text NOT NULL DEFAULT 'customer';

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_job_type_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_job_type_check CHECK (job_type IN ('customer', 'guest'));
  END IF;
END $$;

ALTER TABLE public.jobs
  ALTER COLUMN file_type DROP NOT NULL,
  ALTER COLUMN requested_service DROP NOT NULL,
  ALTER COLUMN customer_type DROP NOT NULL,
  ALTER COLUMN customer_first_name DROP NOT NULL,
  ALTER COLUMN customer_last_name DROP NOT NULL,
  ALTER COLUMN customer_email DROP NOT NULL,
  ALTER COLUMN customer_country DROP NOT NULL,
  ALTER COLUMN vehicle_make DROP NOT NULL,
  ALTER COLUMN vehicle_model DROP NOT NULL,
  ALTER COLUMN vehicle_year DROP NOT NULL,
  ALTER COLUMN vehicle_engine DROP NOT NULL,
  ALTER COLUMN vehicle_fuel_type DROP NOT NULL,
  ALTER COLUMN vehicle_vin DROP NOT NULL;

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_customer_details_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_customer_details_check CHECK (
      job_type = 'guest' OR (
        file_type IS NOT NULL AND requested_service IS NOT NULL AND customer_type IS NOT NULL
        AND customer_first_name IS NOT NULL AND customer_last_name IS NOT NULL AND customer_email IS NOT NULL
        AND customer_country IS NOT NULL AND vehicle_make IS NOT NULL AND vehicle_model IS NOT NULL
        AND vehicle_year IS NOT NULL AND vehicle_engine IS NOT NULL AND vehicle_fuel_type IS NOT NULL
        AND vehicle_vin IS NOT NULL
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'jobs_guest_contact_check') THEN
    ALTER TABLE public.jobs ADD CONSTRAINT jobs_guest_contact_check CHECK (
      job_type <> 'guest' OR customer_email IS NOT NULL OR customer_phone IS NOT NULL
    );
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS jobs_job_type_idx ON public.jobs (job_type);
