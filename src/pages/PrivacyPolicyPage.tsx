import { LegalDocument, LegalParagraphs } from '@/components/content/LegalDocument';
import { SITE_CONFIG } from '@/lib/siteConfig';

const List = ({ items }: { items: string[] }) => (
  <ul className="flex list-disc flex-col gap-2 pl-5 marker:text-neutral-500">
    {items.map((item) => (
      <li key={item}>{item}</li>
    ))}
  </ul>
);

export function PrivacyPolicyPage() {
  return (
    <LegalDocument
      title="Privacy Policy"
      description="How ZEROONEMOD collects, uses, stores and protects personal data under the GDPR and Spanish data protection law."
      updated="13 November 2026"
      sections={[
        {
          heading: '1. Controller',
          body: (
            <LegalParagraphs>
              <p>
                The controller of your personal data is {SITE_CONFIG.companyLegalName}, {SITE_CONFIG.companyAddress},
                Tax ID {SITE_CONFIG.companyTaxId} (&quot;ZEROONEMOD&quot;, &quot;we&quot;). You can contact us at{' '}
                {SITE_CONFIG.businessEmail}.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '2. Data we collect',
          body: (
            <LegalParagraphs>
              <List
                items={[
                  'Contact details you provide: name, email address, phone number, country and company name.',
                  'Vehicle and control unit details you provide for a file service, such as make, model, year, engine and ECU or TCU reference.',
                  'Files you upload: original ECU or TCU files and the modified files we produce for you.',
                  'Messages you send through our contact and partner forms.',
                  'Account and job records if you create an account or submit a job, including job status and references.',
                ]}
              />
            </LegalParagraphs>
          ),
        },
        {
          heading: '3. Purposes and legal basis',
          body: (
            <LegalParagraphs>
              <List
                items={[
                  'Carrying out a file service you request: performance of a contract (Article 6(1)(b) GDPR).',
                  'Answering messages and partner requests you send: your consent, given when you tick the box (Article 6(1)(a) GDPR), or steps taken at your request before a contract.',
                  'Keeping accounting and tax records where the law requires it: legal obligation (Article 6(1)(c) GDPR).',
                  'Protecting our service against abuse and spam: our legitimate interest (Article 6(1)(f) GDPR).',
                ]}
              />
            </LegalParagraphs>
          ),
        },
        {
          heading: '4. Retention',
          body: (
            <LegalParagraphs>
              <p>
                We keep job files and related records for as long as needed to deliver and support the service, and
                then for the periods required by law. Contact and partner request messages are kept only as long as
                needed to answer them and resolve the matter. Original files may be removed earlier on request, unless
                we must keep them for legal reasons.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '5. Who we share data with',
          body: (
            <LegalParagraphs>
              <p>
                We use trusted service providers to run the website, store data and send email. They process data only
                on our instructions and under written agreements. We do not sell personal data.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '6. Your rights',
          body: (
            <LegalParagraphs>
              <p>
                Under the GDPR you may request access to, rectification of, erasure of, restriction of or objection to
                the processing of your data, and data portability. You may withdraw consent at any time without
                affecting processing carried out before withdrawal. To exercise these rights, email{' '}
                {SITE_CONFIG.businessEmail}. You may also complain to the Spanish Data Protection Agency (AEPD) at
                www.aepd.es.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '7. Security',
          body: (
            <LegalParagraphs>
              <p>
                Uploaded files are stored in private storage that is not publicly accessible. Access to personal data
                is limited to the people and systems that need it to provide the service.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '8. Cookies',
          body: (
            <LegalParagraphs>
              <p>Please see our Cookie Policy for details of the storage the website uses.</p>
            </LegalParagraphs>
          ),
        },
      ]}
    />
  );
}
