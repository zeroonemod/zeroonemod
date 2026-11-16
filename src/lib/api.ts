import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export class ApiError extends Error {
  constructor(message: string, readonly status?: number) {
    super(message);
  }
}

/** Calls an edge function and turns its { error } response into a readable ApiError. */
export async function callFunction<T>(name: string, body: Record<string, unknown>): Promise<T> {
  const { data, error } = await supabase.functions.invoke(name, { body });
  if (error) {
    let message = 'Something went wrong. Please try again.';
    let status: number | undefined;
    if (error instanceof FunctionsHttpError) {
      status = error.context.status;
      const payload = await error.context.json().catch(() => null);
      if (payload && typeof payload.error === 'string') message = payload.error;
    }
    throw new ApiError(message, status);
  }
  return data as T;
}

export type NotifyEvent =
  | 'status_changed'
  | 'quotation_sent'
  | 'payment_link'
  | 'delivered'
  | 'admin_message'
  | 'customer_message'
  | 'additional_files';

/** Sends the matching email in the background. Never blocks or fails the action itself. */
export function notify(jobId: string, event: NotifyEvent) {
  void callFunction('notify', { jobId, event }).catch((error) => console.warn('notification not sent', error));
}

export function errorMessage(error: unknown, fallback = 'Something went wrong. Please try again.'): string {
  if (error instanceof Error && error.message) return error.message;
  if (error && typeof error === 'object' && 'message' in error && typeof error.message === 'string') return error.message;
  return fallback;
}
