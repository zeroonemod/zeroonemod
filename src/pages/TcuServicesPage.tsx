import { Cog, FileCode, RotateCcw, TriangleAlert, Gauge } from 'lucide-react';
import { ContentPage, NoticeCard, SubmitCta } from '@/components/content/ContentPage';
import { ServiceGrid, type ServiceItem } from '@/components/content/ServiceList';

const SERVICES: ServiceItem[] = [
  {
    icon: Cog,
    title: 'TCU calibration',
    description:
      'Transmission control file adjustments for smoother, more consistent shifting on supported automatic gearboxes.',
    items: ['Shift point adjustments', 'Shift firmness and timing', 'Torque limit review'],
  },
  {
    icon: Gauge,
    title: 'Supported TCU modifications',
    description:
      'Software changes to supported transmission control units, planned against your file and the gearbox fitted to your vehicle.',
    items: ['Launch control strategy changes', 'Clutch engagement parameters', 'Converter lock-up behaviour'],
  },
  {
    icon: RotateCcw,
    title: 'Original file restoration',
    description:
      'Return the gearbox software to its factory calibration using the original file we stored when your job started.',
    items: ['Restore from your stored original', 'Identification check before return'],
  },
  {
    icon: TriangleAlert,
    title: 'DTC off on request',
    description:
      'Selected diagnostic trouble codes switched off in the TCU software on request, where the file supports it. We confirm which codes can be removed after reviewing your file.',
    items: ['Individual fault codes on request', 'Checked against your original file'],
  },
  {
    icon: FileCode,
    title: 'File review before work',
    description:
      'Send your TCU file for review first. We confirm what is supported for your gearbox and explain the options before any work starts.',
  },
];

export function TcuServicesPage() {
  return (
    <ContentPage
      label="TCU services"
      title="TCU File Services"
      intro="Remote file services for transmission control units. Every gearbox file is reviewed against its original calibration, and changes are limited to what the transmission supports."
      description="TCU file services from ZEROONEMOD: transmission calibration, supported TCU modifications, original file restoration and DTC off on request."
    >
      <ServiceGrid services={SERVICES} />
      <NoticeCard>
        Transmission support depends on the gearbox type, its control unit and software version. Compatibility and
        availability depend on the TCU, the vehicle and the original file. Not every
        transmission can be modified safely. We confirm compatibility after reviewing your file, and you remain
        responsible for checking local regulations before using any modified file.
      </NoticeCard>
      <SubmitCta />
    </ContentPage>
  );
}
