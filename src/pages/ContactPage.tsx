import { Clock, Mail } from 'lucide-react';
import { ContentPage } from '@/components/content/ContentPage';
import { ContactForm } from '@/components/forms/ContactForm';
import { Card } from '@/components/ui/Card';
import { FaqSection } from '@/components/home/FaqSection';
import { SITE_CONFIG } from '@/lib/siteConfig';

export function ContactPage() {
  return (
    <ContentPage
      label="Contact"
      title="Contact"
      intro="Questions about a service, your vehicle or an existing job? Send us a message and we will reply by email."
      description="Contact ZEROONEMOD about ECU and TCU file services, your vehicle or an existing job."
    >
      <div className="grid gap-10 lg:grid-cols-[1fr_1.5fr]">
        <aside className="flex flex-col gap-5">
          <Card className="flex flex-col gap-5">
            <div className="flex items-start gap-4">
              <Mail className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white">Email</p>
                <a
                  href={`mailto:${SITE_CONFIG.businessEmail}`}
                  className="break-all text-sm text-neutral-400 underline-offset-4 transition-colors duration-200 hover:text-white hover:underline"
                >
                  {SITE_CONFIG.businessEmail}
                </a>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <Clock className="mt-0.5 h-5 w-5 shrink-0 text-neutral-300" aria-hidden="true" />
              <div className="flex flex-col gap-1">
                <p className="text-sm font-semibold text-white">Response time</p>
                <p className="text-sm leading-[1.5] text-neutral-400">
                  We aim to reply to every message within one working day.
                </p>
              </div>
            </div>
          </Card>
          <p className="text-sm leading-[1.5] text-neutral-400">
            For a file quotation, use Submit a file so we receive your vehicle and control unit details.
          </p>
        </aside>
        <ContactForm />
      </div>

      <FaqSection />
    </ContentPage>
  );
}
