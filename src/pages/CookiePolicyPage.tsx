import { LegalDocument, LegalParagraphs } from '@/components/content/LegalDocument';
import { SITE_CONFIG } from '@/lib/siteConfig';
import { openCookieSettings } from '@/components/layout/CookieBanner';

export function CookiePolicyPage() {
  return (
    <LegalDocument
      title="Cookie Policy"
      description="How ZEROONEMOD uses cookies and similar storage, in line with the EU ePrivacy rules and Spanish law (LSSI-CE)."
      updated="13 November 2026"
      sections={[
        {
          heading: '1. What cookies are',
          body: (
            <LegalParagraphs>
              <p>
                Cookies and similar technologies are small pieces of data stored on your device when you visit a
                website. They help a site work correctly, remember settings and, where permitted, measure use.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '2. Cookies we use',
          body: (
            <LegalParagraphs>
              <p>
                We use only storage that is strictly necessary for the website to work, such as keeping a signed-in
                session and remembering your place in a form. This storage does not track you across other websites.
                It does not require your consent under the ePrivacy rules.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '3. Analytics and marketing',
          body: (
            <LegalParagraphs>
              <p>
                At present ZEROONEMOD does not use advertising or third-party tracking cookies. If we introduce
                analytics or marketing cookies in future, we will ask for your consent first, and you will be able to
                change or withdraw it at any time through this site.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '4. Managing cookies',
          body: (
            <LegalParagraphs>
              <p>
                You can delete or block cookies in your browser settings. Blocking strictly necessary storage may stop
                parts of the website, such as the signed-in area, from working.
              </p>
              <p>
                <button
                  type="button"
                  onClick={openCookieSettings}
                  className="text-white underline underline-offset-4 hover:text-neutral-300"
                >
                  Change your cookie settings
                </button>
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '5. Contact',
          body: (
            <LegalParagraphs>
              <p>
                For questions about this policy, email {SITE_CONFIG.businessEmail}. For more on how we handle personal
                data, see our Privacy Policy.
              </p>
            </LegalParagraphs>
          ),
        },
      ]}
    />
  );
}
