import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { SITE_CONFIG } from '@/lib/siteConfig';

interface DocumentMeta {
  title: string;
  description: string;
  /** Private areas (account, admin, login) are kept out of search engines. */
  noindex?: boolean;
}

function setMeta(selector: string, attribute: 'name' | 'property', key: string, content: string) {
  let tag = document.head.querySelector<HTMLMetaElement>(selector);
  if (!tag) {
    tag = document.createElement('meta');
    tag.setAttribute(attribute, key);
    document.head.appendChild(tag);
  }
  tag.content = content;
}

/** Page title, description, canonical URL, Open Graph tags and robots for the current route. */
export function useDocumentMeta({ title, description, noindex = false }: DocumentMeta) {
  const { pathname } = useLocation();

  useEffect(() => {
    const url = `${SITE_CONFIG.url}${pathname === '/' ? '/' : pathname}`;
    document.title = title;
    setMeta('meta[name="description"]', 'name', 'description', description);
    setMeta('meta[name="robots"]', 'name', 'robots', noindex ? 'noindex, nofollow' : 'index, follow');
    setMeta('meta[property="og:title"]', 'property', 'og:title', title);
    setMeta('meta[property="og:description"]', 'property', 'og:description', description);
    setMeta('meta[property="og:url"]', 'property', 'og:url', url);
    setMeta('meta[name="twitter:title"]', 'name', 'twitter:title', title);
    setMeta('meta[name="twitter:description"]', 'name', 'twitter:description', description);

    let canonical = document.head.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement('link');
      canonical.rel = 'canonical';
      document.head.appendChild(canonical);
    }
    canonical.href = url;
  }, [title, description, noindex, pathname]);
}
