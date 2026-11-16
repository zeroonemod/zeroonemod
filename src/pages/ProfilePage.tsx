import { AccountShell } from '@/components/layout/AccountShell';
import { CustomerProfile } from '@/features/dashboard/CustomerProfile';

export function ProfilePage() {
  return (
    <AccountShell title="Profile">
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold leading-[1.2] text-white sm:text-4xl">Profile</h1>
          <p className="text-sm leading-[1.5] text-neutral-400">Keep your contact details up to date and manage your account.</p>
        </header>
        <CustomerProfile />
      </div>
    </AccountShell>
  );
}
