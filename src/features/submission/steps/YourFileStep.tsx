import { FileTypeStep } from '@/features/submission/steps/FileTypeStep';
import { ServiceStep } from '@/features/submission/steps/ServiceStep';
import type { StepProps } from '@/features/submission/types';

export function YourFileStep(props: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <FileTypeStep {...props} />
      <ServiceStep {...props} />
    </div>
  );
}
