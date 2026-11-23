/*
# Extra vehicle details and hardware photos

Plain-English summary
- Step 2 of the submission form now also asks for power (HP or kW), torque (Nm), gearbox type
  and whether the file was modified before. These are stored on the job.
- Customers can add photos of the ECU/TCU label (where the hardware and software numbers are
  printed). Photos are stored privately under ZOM-000001/photos/ and listed as job files of
  kind 'photo'. The job owner and the admin can view them, nobody else.

Safe to run on the live database: it only adds columns and widens two rules.
*/

ALTER TABLE public.jobs
  ADD COLUMN IF NOT EXISTS vehicle_power numeric(6,1),
  ADD COLUMN IF NOT EXISTS vehicle_power_unit text,
  ADD COLUMN IF NOT EXISTS vehicle_torque_nm integer,
  ADD COLUMN IF NOT EXISTS gearbox_type text,
  ADD COLUMN IF NOT EXISTS file_previously_modified boolean;

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_vehicle_power_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_vehicle_power_check CHECK (vehicle_power IS NULL OR (vehicle_power > 0 AND vehicle_power <= 3000));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_vehicle_power_unit_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_vehicle_power_unit_check CHECK (vehicle_power_unit IS NULL OR vehicle_power_unit IN ('HP', 'kW'));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_vehicle_torque_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_vehicle_torque_check CHECK (vehicle_torque_nm IS NULL OR (vehicle_torque_nm > 0 AND vehicle_torque_nm <= 5000));
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_gearbox_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_gearbox_type_check CHECK (gearbox_type IS NULL OR gearbox_type IN ('manual', 'automatic', 'dual_clutch', 'cvt', 'other'));

-- Hardware photos are a new kind of job file.
ALTER TABLE public.job_files DROP CONSTRAINT IF EXISTS job_files_kind_check;
ALTER TABLE public.job_files ADD CONSTRAINT job_files_kind_check CHECK (kind IN ('original', 'additional', 'completed', 'photo'));

-- Job owners may also view their photos (the admin already sees everything).
DROP POLICY IF EXISTS job_files_read ON storage.objects;
CREATE POLICY job_files_read ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'job-files'
    AND (
      public.is_admin()
      OR EXISTS (
        SELECT 1 FROM public.jobs j
         WHERE j.reference = (storage.foldername(name))[1]
           AND j.user_id = auth.uid()
           AND (
             (storage.foldername(name))[2] IN ('original', 'additional', 'photos')
             OR ((storage.foldername(name))[2] = 'completed' AND j.payment_status = 'paid' AND j.status = 'Delivered')
           )
      )
    )
  );
