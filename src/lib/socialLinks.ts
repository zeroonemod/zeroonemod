import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

/** Footer social links, set by the admin in Settings. Empty string = no link yet. */
export interface SocialLinks {
  instagram: string;
  facebook: string;
  whatsapp: string;
}

const EMPTY: SocialLinks = { instagram: '', facebook: '', whatsapp: '' };

let cached: Promise<SocialLinks> | null = null;

/** Loaded once per page visit and shared by every footer. */
function loadSocialLinks(): Promise<SocialLinks> {
  cached ??= Promise.resolve(supabase.rpc('site_social_links')).then(({ data, error }) => {
    if (error || !data || typeof data !== 'object') return EMPTY;
    const value = data as Partial<SocialLinks>;
    return { instagram: value.instagram ?? '', facebook: value.facebook ?? '', whatsapp: value.whatsapp ?? '' };
  }, () => EMPTY);
  return cached;
}

/** After the admin saves new links, the next footer shows them. */
export function clearSocialLinksCache() {
  cached = null;
}

/** wa.me link from a number such as "+355 69 123 4567". */
export function whatsappLink(number: string): string {
  const digits = number.replace(/\D/g, '').replace(/^00/, '');
  return digits ? `https://wa.me/${digits}` : '';
}

export function useSocialLinks(): SocialLinks {
  const [links, setLinks] = useState<SocialLinks>(EMPTY);
  useEffect(() => {
    let active = true;
    void loadSocialLinks().then((next) => {
      if (active) setLinks(next);
    });
    return () => {
      active = false;
    };
  }, []);
  return links;
}
