import { useCallback, useEffect, useState, type ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import type { MessageTemplate } from '@/features/jobs/JobMessages';

export function AdminPageHeader({ title, description, actions }: { title: string; description?: string; actions?: ReactNode }) {
  return (
    <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="flex min-w-0 flex-col gap-2">
        <h1 className="text-3xl font-semibold leading-[1.2] sm:text-4xl">{title}</h1>
        {description && <p className="text-sm leading-[1.5] text-neutral-400">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-3">{actions}</div>}
    </header>
  );
}

/** Static admin panel with the same card look, without hover movement. */
export function Panel({ title, children, actions, className = '', id }: { title?: string; children: ReactNode; actions?: ReactNode; className?: string; id?: string }) {
  return (
    <section id={id} className={`min-w-0 scroll-mt-24 rounded-2xl border border-white/[0.08] border-t-2 border-t-brand-500/60 bg-surface p-5 sm:p-7 ${className}`}>
      {(title || actions) && (
        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          {title && <h2 className="text-lg font-semibold text-white">{title}</h2>}
          {actions}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyRow({ children }: { children: ReactNode }) {
  return <p className="rounded-xl border border-white/[0.08] bg-surface p-6 text-sm text-neutral-400">{children}</p>;
}

export interface AdminSettings {
  notification_email: string;
  support_email: string;
  billing_email: string;
  retention_days: number;
  auto_delete_enabled: boolean;
  templates: MessageTemplate[];
}

export function useAdminSettings() {
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [error, setError] = useState(false);

  const reload = useCallback(async () => {
    const { data, error: queryError } = await supabase
      .from('admin_settings')
      .select('notification_email, support_email, billing_email, retention_days, auto_delete_enabled, templates')
      .eq('id', true)
      .maybeSingle();
    if (queryError || !data) {
      setError(true);
      return;
    }
    setError(false);
    setSettings({ ...data, templates: Array.isArray(data.templates) ? (data.templates as MessageTemplate[]) : [] });
  }, []);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { settings, error, reload };
}

/** Reply templates for the message box. Works for admin and staff. */
export function useReplyTemplates(): MessageTemplate[] {
  const [templates, setTemplates] = useState<MessageTemplate[]>([]);
  useEffect(() => {
    supabase.rpc('team_reply_templates').then(({ data }) => {
      if (Array.isArray(data)) setTemplates(data as MessageTemplate[]);
    });
  }, []);
  return templates;
}

export interface ProfileRow {
  id: string;
  email: string | null;
  role: 'customer' | 'partner' | 'staff' | 'admin';
  full_name: string | null;
  company_name: string | null;
  customer_type: string | null;
  country: string | null;
  phone: string | null;
  is_active: boolean;
  created_at: string;
}

export const PROFILE_COLUMNS = 'id, email, role, full_name, company_name, customer_type, country, phone, is_active, created_at';


/** Visible marker for guest requests in lists and on the job page. */
export function GuestBadge() {
  return (
    <span className="inline-flex items-center whitespace-nowrap rounded-full border border-brand-500/60 bg-brand-500/[0.08] px-2.5 py-0.5 text-[11px] font-semibold uppercase tracking-wider text-brand-400">
      Guest request
    </span>
  );
}
