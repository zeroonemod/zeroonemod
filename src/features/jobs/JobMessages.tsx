import { useEffect, useRef, useState, type FormEvent } from 'react';
import { Loader2, Send } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { controlClass } from '@/components/ui/FormField';
import { notify } from '@/lib/api';
import { supabase } from '@/lib/supabase';
import { formatDateTime } from '@/features/jobs/jobFormat';
import { MESSAGE_COLUMNS, type JobMessageRow } from '@/features/jobs/jobTypes';

export interface MessageTemplate {
  id: string;
  title: string;
  body: string;
}

interface JobMessagesProps {
  jobId: string;
  viewer: 'customer' | 'admin';
  templates?: MessageTemplate[];
}

/** Conversation between the customer and ZEROONEMOD on one job. The other side gets an email for each new message. */
export function JobMessages({ jobId, viewer, templates = [] }: JobMessagesProps) {
  const [messages, setMessages] = useState<JobMessageRow[] | null>(null);
  const [loadError, setLoadError] = useState(false);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [sendError, setSendError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);
  const listRef = useRef<HTMLUListElement>(null);
  const inputId = `job-message-${viewer}`;

  useEffect(() => {
    let active = true;
    const readField = viewer === 'customer' ? 'customer_read_at' : 'admin_read_at';
    const unreadFrom = viewer === 'customer' ? 'admin' : 'customer';

    supabase
      .from('job_messages')
      .select(MESSAGE_COLUMNS)
      .eq('job_id', jobId)
      .order('created_at', { ascending: true })
      .then(({ data, error }) => {
        if (!active) return;
        if (error || !Array.isArray(data)) {
          setLoadError(true);
          return;
        }
        setLoadError(false);
        const rows = data as JobMessageRow[];
        setMessages(rows);
        if (rows.some((m) => m.sender_role === unreadFrom && !m[readField])) {
          void supabase
            .from('job_messages')
            .update({ [readField]: new Date().toISOString() })
            .eq('job_id', jobId)
            .eq('sender_role', unreadFrom)
            .is(readField, null);
        }
      });
    return () => {
      active = false;
    };
  }, [jobId, viewer, reloadKey]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages]);

  const handleSend = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const body = draft.trim();
    if (!body) return;
    setSending(true);
    setSendError(null);
    const { error } = await supabase.from('job_messages').insert({ job_id: jobId, sender_role: viewer, body });
    setSending(false);
    if (error) {
      setSendError('Your message could not be sent. Please try again.');
      return;
    }
    notify(jobId, viewer === 'admin' ? 'admin_message' : 'customer_message');
    setDraft('');
    setReloadKey((key) => key + 1);
  };

  return (
    <div className="flex flex-col gap-5">
      {loadError && (
        <p role="alert" className="text-sm text-red-400">
          We could not load the messages. Please refresh the page.
        </p>
      )}

      {messages && messages.length === 0 && <p className="text-sm text-neutral-400">No messages yet.</p>}

      {messages && messages.length > 0 && (
        <ul ref={listRef} className="flex max-h-[420px] flex-col gap-3 overflow-y-auto pr-1" aria-live="polite">
          {messages.map((message) => {
            const isOwn = message.sender_role === viewer;
            return (
              <li key={message.id} className={`flex flex-col gap-1 ${isOwn ? 'items-end' : 'items-start'}`}>
                <div
                  className={`max-w-[85%] whitespace-pre-wrap break-words rounded-2xl px-4 py-3 text-sm leading-[1.5] ${
                    isOwn ? 'bg-white/10 text-white' : 'border border-white/[0.08] bg-surface-sunken text-neutral-200'
                  }`}
                >
                  {message.body}
                </div>
                <span className="text-xs text-neutral-500">
                  {isOwn ? 'You' : viewer === 'customer' ? 'ZEROONEMOD' : 'Customer'} · {formatDateTime(message.created_at)}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      <form onSubmit={handleSend} className="flex flex-col gap-3 border-t border-white/[0.08] pt-5">
        {templates.length > 0 && (
          <div className="flex flex-wrap gap-2" aria-label="Reply templates">
            {templates.map((template) => (
              <button
                key={template.id}
                type="button"
                onClick={() => setDraft(template.body)}
                className="rounded-full border border-white/15 px-3 py-1.5 text-xs text-neutral-300 transition-colors duration-200 hover:border-brand-500/60 hover:text-white"
              >
                {template.title}
              </button>
            ))}
          </div>
        )}
        <label htmlFor={inputId} className="text-sm font-medium text-neutral-200">
          Write a message
        </label>
        <textarea
          id={inputId}
          value={draft}
          maxLength={5000}
          onChange={(event) => setDraft(event.target.value)}
          rows={3}
          className={`${controlClass()} resize-y py-3 leading-relaxed`}
        />
        {sendError && (
          <p role="alert" className="text-sm text-red-400">
            {sendError}
          </p>
        )}
        <Button type="submit" disabled={sending || !draft.trim()} className="w-full sm:w-auto sm:self-end">
          {sending ? <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" /> : <Send className="h-4 w-4" aria-hidden="true" />}
          Send message
        </Button>
      </form>
    </div>
  );
}
