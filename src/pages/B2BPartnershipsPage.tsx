import { Briefcase, FolderOpen, History, Lock, MessageSquare, Send } from 'lucide-react';
import { ContentPage, FeatureCard } from '@/components/content/ContentPage';
import { PartnerRequestForm } from '@/components/forms/PartnerRequestForm';

const BENEFITS = [
  {
    icon: Briefcase,
    title: 'Dedicated B2B services',
    description: 'Service terms and handling planned around the volume and workflow of professional businesses.',
  },
  {
    icon: History,
    title: 'Recurring customer relationships',
    description: 'Work for your own customers is tracked against your business, so repeat jobs are easy to follow.',
  },
  {
    icon: MessageSquare,
    title: 'Direct communication',
    description: 'Talk to the engineers handling your files, without a call centre in between.',
  },
  {
    icon: Send,
    title: 'File submission and delivery',
    description: 'Submit files for your customers and receive the finished work through a clear, traceable process.',
  },
  {
    icon: Lock,
    title: 'Private partner accounts',
    description: 'Partner accounts, once approved by ZEROONEMOD, keep your jobs and customer details separate from others.',
  },
  {
    icon: FolderOpen,
    title: 'Job history and file management',
    description: 'A record of every job, its status and the files involved, kept in one place for your own records.',
  },
];

export function B2BPartnershipsPage() {
  return (
    <ContentPage
      label="Partnerships"
      title="B2B Partnerships"
      intro="ZEROONEMOD works with workshops, garages, tuning businesses and automotive professionals who need reliable remote file services for their own customers."
      description="B2B partnerships with ZEROONEMOD for workshops, garages, tuning businesses and automotive professionals. Request partner access for admin review."
    >
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {BENEFITS.map((benefit) => (
          <FeatureCard key={benefit.title} icon={benefit.icon} title={benefit.title} description={benefit.description} />
        ))}
      </div>

      <section
        id="partner-request"
        aria-labelledby="partner-request-heading"
        className="scroll-mt-24 grid gap-12 border-t border-white/[0.08] pt-14 lg:grid-cols-[1fr_1.4fr]"
      >
        <div className="flex flex-col gap-4">
          <h2 id="partner-request-heading" className="text-2xl font-bold leading-[1.2] sm:text-3xl">
            Request partner access
          </h2>
          <p className="text-sm leading-[1.5] text-neutral-400">
            Tell us about your business. Each request is reviewed by our team. Sending this form does not create an
            account or grant access to any system. If approved, we will contact you to set up your partner account.
          </p>
        </div>
        <PartnerRequestForm />
      </section>
    </ContentPage>
  );
}
