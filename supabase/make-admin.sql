-- Run once in the Supabase SQL editor after creating your own login
-- (Authentication > Users > Add user, with "Auto confirm user" ticked).
-- Replace the email with the admin login address.
UPDATE public.profiles SET role = 'admin', is_active = true WHERE email = lower('info@zeroonemod.com');
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
