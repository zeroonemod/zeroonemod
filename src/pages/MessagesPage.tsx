import { AccountShell } from '@/components/layout/AccountShell';
import { LoadingState } from '@/components/ui/LoadingState';
import { MessageThreadList } from '@/features/jobs/MessageThreadList';
import { useMessageThreads } from '@/features/jobs/useMessageThreads';

export function MessagesPage() {
  const { threads, error } = useMessageThreads('customer');

  return (
    <AccountShell title="Messages">
      <div className="flex flex-col gap-10">
        <header className="flex flex-col gap-3">
          <h1 className="text-3xl font-semibold leading-[1.2] text-white sm:text-4xl">Messages</h1>
          <p className="text-sm leading-[1.5] text-neutral-400">Conversations with ZEROONEMOD about your jobs. Open a job to reply.</p>
        </header>
        {error ? (
          <p role="alert" className="text-sm text-red-400">We could not load your messages. Please refresh the page.</p>
        ) : !threads ? (
          <LoadingState label="Loading messages" />
        ) : (
          <MessageThreadList
            threads={threads}
            linkFor={(thread) => `/dashboard/jobs/${thread.reference}#messages`}
            emptyText="No messages yet. You can write to us from any job."
          />
        )}
      </div>
    </AccountShell>
  );
}
