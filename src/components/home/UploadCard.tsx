import { useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/Card';
import { Dropzone } from '@/components/ui/Dropzone';
import { useSubmissionFiles } from '@/features/submission/SubmissionFilesContext';

export function UploadCard() {
  const navigate = useNavigate();
  const { addFiles } = useSubmissionFiles();

  const handleFiles = (files: File[]) => {
    addFiles(files);
    navigate('/submit');
  };

  return (
    <Card padding="lg" className="w-full max-w-3xl">
      <div className="mb-6 flex flex-col gap-2">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-neutral-400">Start your submission</p>
        <h2 className="text-xl font-semibold leading-[1.2] text-white sm:text-2xl">Upload your original file</h2>
        <p className="text-sm leading-[1.5] text-neutral-400">
          Your file stays on this device until you submit. You will complete a short guided form next.
        </p>
      </div>
      <Dropzone onFilesSelected={handleFiles} />
    </Card>
  );
}
