import { Link } from 'react-router-dom';
import { Plus } from 'lucide-react';
import { AccountShell } from '@/components/layout/AccountShell';
import { buttonClasses } from '@/components/ui/Button';
import { CustomerJobList } from '@/features/dashboard/CustomerJobList';

export function DashboardPage() {
  return (
    <AccountShell title="My Jobs">
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="flex flex-col gap-3">
            <h1 className="text-3xl font-semibold leading-[1.2] text-white sm:text-4xl">My jobs</h1>
            <p className="text-sm leading-[1.5] text-neutral-400">Track every file you have sent us, from review to delivery.</p>
          </div>
          <Link to="/submit" className={buttonClasses('primary', 'md', 'w-full sm:w-auto')}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Submit another file
          </Link>
        </header>
        <CustomerJobList />
      </div>
    </AccountShell>
  );
}
