/*
# Submission core schema

Plain-English summary: creates the tables that store customer accounts, submitted jobs and their uploaded files, plus a private storage bucket for the files.

1. New Tables
- `profiles`: one row per customer account (name, company, customer type, country, phone) and a role (customer, partner or admin). Only the admin can change roles.
- `jobs`: one row per submission. Holds the job reference (ZOM-000001, ZOM-000002, ...), status, requested service, vehicle details, ECU/TCU details, customer contact details and the privacy consent timestamp.
- `job_files`: one row per uploaded file, pointing at its location in the private bucket.

2. Sequences
- `job_reference_seq` produces the incrementing job numbers used by `jobs.reference`.

3. Storage
- Private bucket `job-files`, 100 MB limit per file, no public access.
- Visitors (anonymous or signed in) may upload only into the `pending/` folder while a submission is in progress. Nobody can list, read or delete from the browser.
- The submit-job edge function moves files into `<reference>/original/` using the service role.

4. Security
- Row level security is enabled on every table.
- Signed-in customers can read only their own profile, jobs and job files.
- Nobody on the public API can insert, update or delete jobs. Those writes happen in the submit-job edge function with the service role.

5. Notes
- Statements are idempotent and safe to re-run.
- Job statuses are constrained to the eight agreed values, starting at "Submitted".
*/

CREATE SEQUENCE IF NOT EXISTS job_reference_seq START WITH 1;

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  role text NOT NULL DEFAULT 'customer' CHECK (role IN ('customer', 'partner', 'admin')),
  full_name text,
  company_name text,
  customer_type text CHECK (customer_type IN ('individual', 'workshop')),
  country text,
  phone text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reference text NOT NULL UNIQUE DEFAULT 'ZOM-' || lpad(nextval('job_reference_seq')::text, 6, '0'),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  status text NOT NULL DEFAULT 'Submitted' CHECK (status IN (
    'Submitted', 'Under Review', 'Awaiting Information', 'Quotation Sent',
    'Awaiting Payment', 'In Progress', 'Completed', 'Delivered'
  )),
  file_type text NOT NULL CHECK (file_type IN ('ECU', 'TCU')),
  requested_service text NOT NULL CHECK (requested_service IN (
    'stage1_calibration', 'original_restoration', 'decoding', 'other_modification', 'not_sure'
  )),
  service_comments text,
  customer_type text NOT NULL CHECK (customer_type IN ('individual', 'workshop')),
  customer_first_name text NOT NULL,
  customer_last_name text NOT NULL,
  customer_email text NOT NULL,
  customer_country text NOT NULL,
  customer_phone text,
  company_name text,
  vehicle_make text NOT NULL,
  vehicle_model text NOT NULL,
  vehicle_year integer NOT NULL,
  vehicle_engine text NOT NULL,
  vehicle_fuel_type text NOT NULL,
  vehicle_vin text NOT NULL,
  ecu_manufacturer text NOT NULL,
  ecu_hardware_number text NOT NULL,
  ecu_software_number text NOT NULL,
  ecu_identification_numbers text,
  privacy_consent_at timestamptz NOT NULL,
  privacy_policy_version text NOT NULL DEFAULT 'v1',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS jobs_user_id_idx ON jobs (user_id);
CREATE INDEX IF NOT EXISTS jobs_customer_email_idx ON jobs (lower(customer_email));
CREATE INDEX IF NOT EXISTS jobs_created_at_idx ON jobs (created_at DESC);

CREATE TABLE IF NOT EXISTS job_files (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id uuid NOT NULL REFERENCES jobs(id) ON DELETE CASCADE,
  kind text NOT NULL DEFAULT 'original' CHECK (kind IN ('original', 'completed')),
  file_name text NOT NULL,
  storage_path text NOT NULL,
  size_bytes bigint NOT NULL DEFAULT 0,
  mime_type text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS job_files_job_id_idx ON job_files (job_id);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE job_files ENABLE ROW LEVEL SECURITY;

GRANT SELECT ON profiles TO authenticated;
GRANT UPDATE (full_name, company_name, country, phone) ON profiles TO authenticated;
GRANT ALL ON profiles TO service_role;

GRANT SELECT ON jobs TO authenticated;
GRANT ALL ON jobs TO service_role;
GRANT USAGE, SELECT ON SEQUENCE job_reference_seq TO service_role;

GRANT SELECT ON job_files TO authenticated;
GRANT ALL ON job_files TO service_role;

DROP POLICY IF EXISTS "select_own_profile" ON profiles;
CREATE POLICY "select_own_profile" ON profiles FOR SELECT
  TO authenticated USING (auth.uid() = id);

DROP POLICY IF EXISTS "update_own_profile" ON profiles;
CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
  TO authenticated USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

DROP POLICY IF EXISTS "select_own_jobs" ON jobs;
CREATE POLICY "select_own_jobs" ON jobs FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "select_own_job_files" ON job_files;
CREATE POLICY "select_own_job_files" ON job_files FOR SELECT
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM jobs
      WHERE jobs.id = job_files.job_id
        AND jobs.user_id = auth.uid()
    )
  );

INSERT INTO storage.buckets (id, name, public, file_size_limit)
VALUES ('job-files', 'job-files', false, 104857600)
ON CONFLICT (id) DO UPDATE SET public = false, file_size_limit = EXCLUDED.file_size_limit;

DROP POLICY IF EXISTS "upload_pending_job_files" ON storage.objects;
CREATE POLICY "upload_pending_job_files" ON storage.objects FOR INSERT
  TO anon, authenticated
  WITH CHECK (bucket_id = 'job-files' AND (storage.foldername(name))[1] = 'pending');
