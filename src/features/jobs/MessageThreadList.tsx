import { Link } from 'react-router-dom';
import { formatDateTime } from '@/features/jobs/jobFormat';
import type { MessageThread } from '@/features/jobs/useMessageThreads';

interface MessageThreadListProps {
  threads: MessageThread[];
  linkFor: (thread: MessageThread) => string;
  showCustomer?: boolean;
  emptyText: string;
}

export function MessageThreadList({ threads, linkFor, showCustomer = false, emptyText }: MessageThreadListProps) {
  if (threads.length === 0) {
    return <p className="rounded-xl border border-white/[0.08] bg-surface p-6 text-sm text-neutral-400">{emptyText}</p>;
  }
  return (
    <ul className="flex flex-col gap-3">
      {threads.map((thread) => (
        <li key={thread.jobId}>
          <Link
            to={linkFor(thread)}
            className={`flex flex-col gap-2 rounded-xl border bg-surface p-5 transition-colors duration-200 hover:border-brand-500/50 ${
              thread.unread > 0 ? 'border-brand-500/40' : 'border-white/[0.08]'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-sm font-semibold text-white">
                {thread.unread > 0 && <span className="h-2 w-2 rounded-full bg-brand-500" aria-hidden="true" />}
                {thread.reference}
                {showCustomer && <span className="font-normal text-neutral-400">· {thread.customer}</span>}
              </span>
              <span className="text-xs text-neutral-500">{formatDateTime(thread.lastAt)}</span>
            </div>
            <p className="text-xs text-neutral-500">{thread.vehicle}</p>
            <p className="line-clamp-2 break-words text-sm text-neutral-300">{thread.lastBody}</p>
            {thread.unread > 0 && (
              <span className="text-xs font-medium text-brand-400">
                {thread.unread} unread message{thread.unread === 1 ? '' : 's'}
              </span>
            )}
          </Link>
        </li>
      ))}
    </ul>
  );
}
