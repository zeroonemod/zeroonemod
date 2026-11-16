import { RadioCards } from '@/components/ui/RadioCards';
import { TextArea } from '@/components/ui/FormControls';
import { SERVICE_OPTIONS, type RequestedService, type StepProps } from '@/features/submission/types';

export function ServiceStep({ form, errors, update }: StepProps) {
  return (
    <div className="flex flex-col gap-8">
      <RadioCards<RequestedService>
        legend="What service do you need?"
        name="requestedService"
        value={form.requestedService}
        onChange={(value) => update('requestedService', value)}
        error={errors.requestedService}
        options={SERVICE_OPTIONS}
      />
      <TextArea
        id="serviceComments"
        label="Comments"
        optional
        placeholder="Anything we should know about your goals, the vehicle or the file"
        value={form.serviceComments}
        onChange={(event) => update('serviceComments', event.target.value)}
        error={errors.serviceComments}
        maxLength={1000}
      />
    </div>
  );
}
