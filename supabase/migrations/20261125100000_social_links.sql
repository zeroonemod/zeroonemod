/*
# Social links in the footer (set in Admin > Settings)

Plain-English summary
- The admin sets the Instagram link, the Facebook link and the WhatsApp number in Settings.
- Visitors only see these three values (through site_social_links), never the other settings.
- Empty value = the footer shows the icon without a link.
- Instagram and Facebook start with the links the owner gave on 2026-11-25; WhatsApp is added later.

Safe to run on the live database.
*/

ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS instagram_url text NOT NULL DEFAULT '';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS facebook_url text NOT NULL DEFAULT '';
ALTER TABLE public.admin_settings ADD COLUMN IF NOT EXISTS whatsapp_number text NOT NULL DEFAULT '';

ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_instagram_url_check;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_instagram_url_check
  CHECK (instagram_url = '' OR (instagram_url ~ '^https://\S+$' AND length(instagram_url) <= 300));
ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_facebook_url_check;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_facebook_url_check
  CHECK (facebook_url = '' OR (facebook_url ~ '^https://\S+$' AND length(facebook_url) <= 300));
ALTER TABLE public.admin_settings DROP CONSTRAINT IF EXISTS admin_settings_whatsapp_number_check;
ALTER TABLE public.admin_settings ADD CONSTRAINT admin_settings_whatsapp_number_check
  CHECK (whatsapp_number = '' OR whatsapp_number ~ '^\+?[0-9 ]{6,20}$');

UPDATE public.admin_settings
   SET instagram_url = 'https://www.instagram.com/zeroonemod',
       facebook_url = 'https://www.facebook.com/share/1AFJjGWhqH/'
 WHERE id = true AND instagram_url = '' AND facebook_url = '';

GRANT UPDATE (instagram_url, facebook_url, whatsapp_number) ON public.admin_settings TO authenticated;

-- Public read of the three footer values only.
CREATE OR REPLACE FUNCTION public.site_social_links()
RETURNS jsonb LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT jsonb_build_object('instagram', instagram_url, 'facebook', facebook_url, 'whatsapp', whatsapp_number)
  FROM public.admin_settings WHERE id = true;
$$;
REVOKE EXECUTE ON FUNCTION public.site_social_links() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.site_social_links() TO anon, authenticated;
