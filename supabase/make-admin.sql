-- Run in the Supabase SQL editor after creating the admin login
-- (Authentication > Users > Add user > admin@zeroonemod.com, with "Auto confirm user" ticked).
--
-- 1. admin@zeroonemod.com becomes the admin (the login used for /admin).
UPDATE public.profiles SET role = 'admin', is_active = true WHERE email = lower('admin@zeroonemod.com');

-- 2. info@zeroonemod.com was the first admin login. It stays the public contact and support
--    address (set in Admin > Settings > Email addresses) but is no longer an admin login.
UPDATE public.profiles SET role = 'customer' WHERE email = lower('info@zeroonemod.com') AND role = 'admin';

-- Check: exactly one row, admin@zeroonemod.com.
SELECT id, email, role FROM public.profiles WHERE role = 'admin';
