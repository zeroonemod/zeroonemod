import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { LoadingState } from '@/components/ui/LoadingState';
import { SearchInput } from '@/components/ui/SearchInput';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, EmptyRow, PROFILE_COLUMNS, type ProfileRow } from '@/features/admin/adminShared';
import { useAdminJobs } from '@/features/admin/useAdminJobs';
import { formatDate } from '@/features/jobs/jobFormat';

export function usePeople(role: 'customer' | 'partner') {
  const [people, setPeople] = useState<ProfileRow[] | null>(null);
  const [error, setError] = useState(false);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    let active = true;
    supabase
      .from('profiles')
      .select(PROFILE_COLUMNS)
      .eq('role', role)
      .order('created_at', { ascending: false })
      .then(({ data, error: queryError }) => {
        if (!active) return;
        if (queryError || !Array.isArray(data)) setError(true);
        else setPeople(data as ProfileRow[]);
      });
    return () => {
      active = false;
    };
  }, [role, version]);

  return { people, error, reload: () => setVersion((v) => v + 1) };
}

export function PeopleList({ people, basePath, jobCounts }: { people: ProfileRow[]; basePath: string; jobCounts: Record<string, number> }) {
  return (
    <ul className="flex flex-col gap-3">
      {people.map((person) => (
        <li key={person.id}>
          <Link
            to={`${basePath}/${person.id}`}
            className="flex flex-col gap-2 rounded-xl border border-white/[0.08] bg-surface p-4 transition-colors hover:border-brand-500/50 sm:flex-row sm:items-center sm:justify-between sm:p-5"
          >
            <div className="flex min-w-0 flex-col gap-1">
              <span className="flex flex-wrap items-center gap-2 text-sm font-semibold text-white">
                {person.full_name || 'No name yet'}
                {person.company_name && <span className="font-normal text-neutral-400">· {person.company_name}</span>}
                {!person.is_active && <span className="rounded-full border border-white/20 px-2 py-0.5 text-[11px] font-medium text-neutral-400">Disabled</span>}
              </span>
              <span className="break-all text-sm text-neutral-400">{person.email}</span>
            </div>
            <div className="flex gap-4 text-xs text-neutral-500">
              <span>{jobCounts[person.id] ?? 0} jobs</span>
              <span>Since {formatDate(person.created_at)}</span>
            </div>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export function AdminCustomersPage() {
  const { people, error } = usePeople('customer');
  const { jobs } = useAdminJobs();
  const [query, setQuery] = useState('');

  const jobCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const job of jobs ?? []) if (job.user_id) counts[job.user_id] = (counts[job.user_id] ?? 0) + 1;
    return counts;
  }, [jobs]);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return (people ?? []).filter((p) => !needle || [p.full_name, p.email, p.company_name, p.country].some((v) => v?.toLowerCase().includes(needle)));
  }, [people, query]);

  if (error) return <p role="alert" className="text-sm text-red-400">We could not load customers.</p>;
  if (!people) return <LoadingState label="Loading customers" />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Customers" description="Accounts are created automatically when someone submits a file." />
      <SearchInput id="customer-search" label="Search customers" placeholder="Name, email, company or country" value={query} onChange={(e) => setQuery(e.target.value)} />
      {visible.length === 0 ? <EmptyRow>{people.length === 0 ? 'No customers yet.' : 'No customers match your search.'}</EmptyRow> : <PeopleList people={visible} basePath="/admin/customers" jobCounts={jobCounts} />}
    </div>
  );
}
