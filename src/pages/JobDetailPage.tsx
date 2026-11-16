import { useParams } from 'react-router-dom';
import { AccountShell } from '@/components/layout/AccountShell';
import { CustomerJobDetail } from '@/features/dashboard/CustomerJobDetail';

export function JobDetailPage() {
  const { reference = '' } = useParams();
  return (
    <AccountShell title={`Job ${reference}`}>
      <CustomerJobDetail reference={reference} />
    </AccountShell>
  );
}
