import { supabase } from '@/lib/supabase';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type RequestKind = 'contact' | 'partner';

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export async function submitRequest(kind: RequestKind, payload: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke('submit-request', {
    body: { kind, ...payload },
  });

  if (error) {
    const status = (error as { context?: { status?: number } }).context?.status;
    throw new Error(status === 429 ? 'rate_limited' : 'request_failed');
  }
  if ((data as { ok?: unknown } | null)?.ok !== true) {
    throw new Error('request_failed');
  }
}

export function describeRequestError(error: unknown): string {
  if (error instanceof Error && error.message === 'rate_limited') {
    return 'You have sent several requests recently. Please try again later or email us directly.';
  }
  return 'We could not send your request. Please try again, or email us directly.';
}
