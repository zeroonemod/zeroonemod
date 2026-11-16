import { ApiError, callFunction } from '@/lib/api';

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export type RequestKind = 'contact' | 'partner';

export function isValidEmail(value: string): boolean {
  return EMAIL_PATTERN.test(value.trim());
}

export async function submitRequest(kind: RequestKind, payload: Record<string, unknown>): Promise<void> {
  const data = await callFunction<{ ok?: boolean }>('submit-request', { kind, ...payload });
  if (data?.ok !== true) throw new ApiError('request_failed');
}

export function describeRequestError(error: unknown): string {
  if (error instanceof ApiError && error.status === 429) {
    return 'You have sent several requests recently. Please try again later or email us directly.';
  }
  return 'We could not send your request. Please try again, or email us directly.';
}

