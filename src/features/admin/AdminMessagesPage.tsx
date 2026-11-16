import { useEffect, useState } from 'react';
import { LoadingState } from '@/components/ui/LoadingState';
import { SelectInput } from '@/components/ui/Select';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, EmptyRow } from '@/features/admin/adminShared';
import { MessageThreadList } from '@/features/jobs/MessageThreadList';
import { useMessageThreads } from '@/features/jobs/useMessageThreads';
import { formatDateTime } from '@/features/jobs/jobFormat';

interface ContactMessage {
  id: string;
  name: string;
  email: string;
  subject: string;
  message: string;
  status: 'new' | 'replied' | 'closed';
  created_at: string;
}

export function AdminMessagesPage() {
  const [tab, setTab] = useState<'jobs' | 'contact'>('jobs');
  const { threads, error } = useMessageThreads('admin');
  const [contacts, setContacts] = useState<ContactMessage[] | null>(null);
  const [version, setVersion] = useState(0);

  useEffect(() => {
    supabase
      .from('contact_messages')
      .select('id, name, email, subject, message, status, created_at')
      .order('created_at', { ascending: false })
      .limit(500)
      .then(({ data }) => setContacts((data ?? []) as ContactMessage[]));
  }, [version]);

  const setStatus = async (id: string, status: ContactMessage['status']) => {
    await supabase.from('contact_messages').update({ status }).eq('id', id);
    setVersion((v) => v + 1);
  };

  const unreadJobs = (threads ?? []).filter((t) => t.unread > 0).length;
  const newContacts = (contacts ?? []).filter((c) => c.status === 'new').length;
  const tabClass = (active: boolean) =>
    `relative -mb-px border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${active ? 'border-brand-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="Messages" description="Customer conversations on jobs and messages from the contact form." />

      <div role="tablist" aria-label="Message type" className="flex gap-6 border-b border-white/[0.08]">
        <button type="button" role="tab" aria-selected={tab === 'jobs'} className={tabClass(tab === 'jobs')} onClick={() => setTab('jobs')}>
          Job messages {unreadJobs > 0 && <span className="ml-1 text-brand-400">({unreadJobs})</span>}
        </button>
        <button type="button" role="tab" aria-selected={tab === 'contact'} className={tabClass(tab === 'contact')} onClick={() => setTab('contact')}>
          Contact form {newContacts > 0 && <span className="ml-1 text-brand-400">({newContacts})</span>}
        </button>
      </div>

      {tab === 'jobs' &&
        (error ? (
          <p role="alert" className="text-sm text-red-400">We could not load messages.</p>
        ) : !threads ? (
          <LoadingState label="Loading messages" />
        ) : (
          <MessageThreadList
            threads={[...threads].sort((a, b) => Number(b.unread > 0) - Number(a.unread > 0) || b.lastAt.localeCompare(a.lastAt))}
            linkFor={(t) => `/admin/jobs/${t.reference}#messages`}
            showCustomer
            emptyText="No job messages yet."
          />
        ))}

      {tab === 'contact' &&
        (!contacts ? (
          <LoadingState label="Loading contact messages" />
        ) : contacts.length === 0 ? (
          <EmptyRow>No contact messages yet.</EmptyRow>
        ) : (
          <ul className="flex flex-col gap-3">
            {contacts.map((contact) => (
              <li
                key={contact.id}
                className={`flex flex-col gap-3 rounded-xl border bg-surface p-5 ${contact.status === 'new' ? 'border-brand-500/40' : 'border-white/[0.08]'}`}
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 flex-col gap-1">
                    <p className="flex items-center gap-2 text-sm font-semibold text-white">
                      {contact.status === 'new' && <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />}
                      {contact.subject}
                    </p>
                    <p className="break-all text-sm text-neutral-400">
                      {contact.name} ·{' '}
                      <a href={`mailto:${contact.email}?subject=${encodeURIComponent(`Re: ${contact.subject}`)}`} className="text-white underline underline-offset-4 hover:text-brand-400">
                        {contact.email}
                      </a>
                    </p>
                  </div>
                  <div className="w-40">
                    <SelectInput
                      id={`contact-status-${contact.id}`}
                      label="Status"
                      hideLabel
                      value={contact.status}
                      onChange={(e) => setStatus(contact.id, e.target.value as ContactMessage['status'])}
                      options={[
                        { value: 'new', label: 'New' },
                        { value: 'replied', label: 'Replied' },
                        { value: 'closed', label: 'Closed' },
                      ]}
                    />
                  </div>
                </div>
                <p className="whitespace-pre-wrap break-words text-sm leading-[1.5] text-neutral-300">{contact.message}</p>
                <p className="text-xs text-neutral-500">{formatDateTime(contact.created_at)}</p>
              </li>
            ))}
          </ul>
        ))}
    </div>
  );
}
