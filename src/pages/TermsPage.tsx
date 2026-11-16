import { LegalDocument, LegalParagraphs } from '@/components/content/LegalDocument';
import { SITE_CONFIG } from '@/lib/siteConfig';

export function TermsPage() {
  return (
    <LegalDocument
      title="Terms & Conditions"
      description="The terms that apply when you use the ZEROONEMOD website and remote ECU and TCU file services."
      updated="13 November 2026"
      sections={[
        {
          heading: '1. About these terms',
          body: (
            <LegalParagraphs>
              <p>
                These terms apply to your use of the ZEROONEMOD website and to any file service you order from{' '}
                {SITE_CONFIG.companyLegalName}. By submitting a file or a request, you accept these terms. If you are a
                consumer in Spain or the EU, your statutory rights are not affected.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '2. Services',
          body: (
            <LegalParagraphs>
              <p>
                We provide remote file services for supported ECU and TCU software. Compatibility depends on the
                control unit, its software version and its hardware condition. We confirm what is possible after
                reviewing your file. No work starts until you have approved the proposed scope and price.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '3. Your responsibilities',
          body: (
            <LegalParagraphs>
              <p>
                You confirm that you own the vehicle and the file you submit, or have the owner&apos;s authority to
                request the work. You are responsible for the accuracy of the vehicle details you provide. You must use
                any modified file in compliance with applicable laws, including road traffic, emissions and
                type-approval rules. Modified files are not intended for use on public roads where this is prohibited.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '4. Prices and payment',
          body: (
            <LegalParagraphs>
              <p>
                Prices are shown or confirmed before you pay. Payment is due for the confirmed service. Where value
                added tax applies, it will be shown separately.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '5. Risk and liability',
          body: (
            <LegalParagraphs>
              <p>
                Changing vehicle software carries risk. Work is carried out with reasonable care and checked against
                the original file, but we cannot be responsible for damage caused by faults elsewhere in the vehicle,
                by incorrect installation, by fuel or hardware issues, or by misuse. Nothing in these terms limits
                liability that cannot be limited under the law.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '6. Originals and returns',
          body: (
            <LegalParagraphs>
              <p>
                We keep the original file you submit so it can be restored later. If you ask us to restore your
                original, we will do so where we hold a valid copy and the vehicle identification matches.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '7. Partner accounts',
          body: (
            <LegalParagraphs>
              <p>
                Submitting a partner request does not create an account or grant access. Partner accounts are approved
                by ZEROONEMOD at its discretion and are subject to separate written terms.
              </p>
            </LegalParagraphs>
          ),
        },
        {
          heading: '8. Governing law',
          body: (
            <LegalParagraphs>
              <p>
                These terms are governed by Spanish law. For consumers, disputes may be brought before the courts of
                their place of residence. Before any proceedings, we encourage you to contact us at{' '}
                {SITE_CONFIG.businessEmail} so we can try to resolve the matter.
              </p>
            </LegalParagraphs>
          ),
        },
      ]}
    />
  );
}
