import { Cpu, FileCode, Gauge, RotateCcw, Wind } from 'lucide-react';
import { ContentPage, NoticeCard, SubmitCta } from '@/components/content/ContentPage';
import { ServiceGrid, type ServiceItem } from '@/components/content/ServiceList';

const SERVICES: ServiceItem[] = [
  {
    icon: Gauge,
    title: 'Stage 1 calibration',
    description:
      'Engine control file adjustments focused on a smoother, more responsive delivery within the limits of your engine and standard components.',
    items: ['Torque and power map review', 'Boost and fuelling adjustments', 'Throttle response tuning'],
  },
  {
    icon: RotateCcw,
    title: 'Original file restoration',
    description:
      'Return to the factory calibration when you need it, for servicing, warranty visits or resale. Your original file is stored and kept available for this purpose.',
    items: ['Restore from your stored original', 'Checksum and identification check'],
  },
  {
    icon: Cpu,
    title: 'Supported ECU modifications',
    description:
      'Software changes to supported engine control units, planned individually against the file you send us and the vehicle it is fitted to.',
    items: ['Limiter and rev range changes', 'Speed limiter adjustments', 'Component-specific parameter changes'],
  },
  {
    icon: Wind,
    title: 'Emissions-related',
    description:
      'Software-side adjustments to emissions systems where they are supported for the specific ECU. Availability depends on the file and local regulations.',
    items: ['DPF and particulate filter strategies', 'AdBlue and SCR strategies', 'EGR strategy adjustments', 'DTC off on request'],
  },
  {
    icon: FileCode,
    title: 'File review before work',
    description:
      'Not sure what your file supports? Send it in and we will review it and explain what can be done before any payment is taken.',
  },
];

export function EcuServicesPage() {
  return (
    <ContentPage
      label="ECU services"
      title="ECU File Services"
      intro="Remote file services for engine control units. Each request starts with your original file, is reviewed individually, and returns with a clear description of what has changed."
      description="ECU file services from ZEROONEMOD: Stage 1 calibration, original file restoration, supported ECU modifications and emissions-related services."
    >
      <ServiceGrid services={SERVICES} />
      <NoticeCard>
        Not every ECU, software version or vehicle is supported. Compatibility and availability depend on the ECU,
        the vehicle and the original file, including the control unit software and its hardware condition. We confirm what is possible after reviewing your file. Modified files
        are for off-road or competition use where permitted by law, and it is your responsibility to check local
        regulations.
      </NoticeCard>
      <SubmitCta />
    </ContentPage>
  );
}
