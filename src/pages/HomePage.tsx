import { PageLayout } from '@/components/layout/PageLayout';
import { HeroSection } from '@/components/home/HeroSection';
import { ServicesSection } from '@/components/home/ServicesSection';
import { WhySection } from '@/components/home/WhySection';
import { HowItWorksSection } from '@/components/home/HowItWorksSection';
import { B2BSection } from '@/components/home/B2BSection';
import { FinalCtaSection } from '@/components/home/FinalCtaSection';
import { FaqSection } from '@/components/home/FaqSection';
import { useDocumentMeta } from '@/lib/useDocumentMeta';

export function HomePage() {
  useDocumentMeta({
    title: 'ZEROONEMOD | ECU & TCU File Services',
    description:
      'Engineering-led remote ECU and TCU file services. Submit your original file for individual technical review, modification and secure delivery.',
  });

  return (
    <PageLayout>
      <HeroSection />
      <ServicesSection />
      <WhySection />
      <HowItWorksSection />
      <B2BSection />
      <FinalCtaSection />
      <FaqSection />
    </PageLayout>
  );
}
