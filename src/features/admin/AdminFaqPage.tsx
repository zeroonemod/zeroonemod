import { useCallback, useEffect, useState, type FormEvent } from 'react';
import { ArrowDown, ArrowUp, Pencil, Plus, Trash2 } from 'lucide-react';
import { NoticeLine, type Notice } from '@/components/ui/Alert';
import { Button } from '@/components/ui/Button';
import { TextArea, TextInput } from '@/components/ui/FormField';
import { LoadingState } from '@/components/ui/LoadingState';
import { supabase } from '@/lib/supabase';
import { AdminPageHeader, confirmAction, EmptyRow, Panel } from '@/features/admin/adminShared';

interface FaqRow {
  id: string;
  question: string;
  answer: string;
  sort_order: number;
}

function FaqEditor({ initial, onSave, onCancel }: { initial?: FaqRow; onSave: (q: string, a: string) => Promise<boolean>; onCancel?: () => void }) {
  const [question, setQuestion] = useState(initial?.question ?? '');
  const [answer, setAnswer] = useState(initial?.answer ?? '');
  const [busy, setBusy] = useState(false);
  const idBase = initial ? `faq-${initial.id}` : 'faq-new';

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!question.trim() || !answer.trim()) return;
    setBusy(true);
    const ok = await onSave(question.trim(), answer.trim());
    setBusy(false);
    if (ok && !initial) {
      setQuestion('');
      setAnswer('');
    }
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-4">
      <TextInput id={`${idBase}-q`} label="Question" maxLength={300} value={question} onChange={(e) => setQuestion(e.target.value)} />
      <TextArea id={`${idBase}-a`} label="Answer" maxLength={3000} value={answer} onChange={(e) => setAnswer(e.target.value)} />
      <div className="flex justify-end gap-2">
        {onCancel && (
          <Button variant="ghost" size="sm" onClick={onCancel}>
            Cancel
          </Button>
        )}
        <Button type="submit" size="sm" disabled={busy || !question.trim() || !answer.trim()}>
          {initial ? 'Save' : 'Add question'}
        </Button>
      </div>
    </form>
  );
}

export function AdminFaqPage() {
  const [items, setItems] = useState<FaqRow[] | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);

  const reload = useCallback(async () => {
    const { data } = await supabase.from('faq_items').select('id, question, answer, sort_order').order('sort_order').order('created_at');
    setItems((data ?? []) as FaqRow[]);
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  const report = (error: unknown, success: string) => {
    setNotice(error ? { tone: 'error', text: 'The change could not be saved.' } : { tone: 'success', text: success });
    return !error;
  };

  const add = async (question: string, answer: string) => {
    const nextOrder = Math.max(0, ...(items ?? []).map((i) => i.sort_order)) + 1;
    const { error } = await supabase.from('faq_items').insert({ question, answer, sort_order: nextOrder });
    await reload();
    return report(error, 'Question added.');
  };

  const update = async (id: string, question: string, answer: string) => {
    const { error } = await supabase.from('faq_items').update({ question, answer }).eq('id', id);
    if (!error) setEditingId(null);
    await reload();
    return report(error, 'Question saved.');
  };

  const remove = async (item: FaqRow) => {
    if (!confirmAction(`Delete "${item.question}"?`)) return;
    const { error } = await supabase.from('faq_items').delete().eq('id', item.id);
    await reload();
    report(error, 'Question deleted.');
  };

  const move = async (index: number, direction: -1 | 1) => {
    if (!items) return;
    const target = index + direction;
    if (target < 0 || target >= items.length) return;
    const reordered = [...items];
    [reordered[index], reordered[target]] = [reordered[target], reordered[index]];
    setItems(reordered);
    const results = await Promise.all(reordered.map((item, i) => supabase.from('faq_items').update({ sort_order: i + 1 }).eq('id', item.id)));
    await reload();
    report(results.find((r) => r.error)?.error, 'Order saved.');
  };

  if (!items) return <LoadingState label="Loading FAQ" />;

  return (
    <div className="flex flex-col gap-8">
      <AdminPageHeader title="FAQ" description="Questions shown on the home and contact pages, in this order." />
      <NoticeLine notice={notice} />

      {items.length === 0 ? (
        <EmptyRow>No questions yet.</EmptyRow>
      ) : (
        <ol className="flex flex-col gap-3">
          {items.map((item, index) => (
            <li key={item.id} className="rounded-xl border border-white/[0.08] bg-surface p-5">
              {editingId === item.id ? (
                <FaqEditor initial={item} onSave={(q, a) => update(item.id, q, a)} onCancel={() => setEditingId(null)} />
              ) : (
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex min-w-0 flex-col gap-2">
                    <p className="text-sm font-semibold text-white">
                      <span className="mr-2 text-brand-400">{String(index + 1).padStart(2, '0')}</span>
                      {item.question}
                    </p>
                    <p className="whitespace-pre-wrap break-words text-sm leading-[1.5] text-neutral-400">{item.answer}</p>
                  </div>
                  <div className="flex shrink-0 gap-1">
                    <IconButton label="Move up" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Move down" onClick={() => move(index, 1)} disabled={index === items.length - 1}>
                      <ArrowDown className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Edit" onClick={() => setEditingId(item.id)}>
                      <Pencil className="h-4 w-4" />
                    </IconButton>
                    <IconButton label="Delete" onClick={() => remove(item)}>
                      <Trash2 className="h-4 w-4" />
                    </IconButton>
                  </div>
                </div>
              )}
            </li>
          ))}
        </ol>
      )}

      <Panel title="Add a question" actions={<Plus className="h-4 w-4 text-brand-500" aria-hidden="true" />}>
        <FaqEditor onSave={add} />
      </Panel>
    </div>
  );
}

function IconButton({ label, onClick, disabled, children }: { label: string; onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-neutral-400 transition-colors hover:bg-white/5 hover:text-white disabled:opacity-30"
    >
      {children}
    </button>
  );
}
