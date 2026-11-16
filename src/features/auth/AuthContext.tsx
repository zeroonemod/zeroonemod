import { createContext, useEffect, useState, type ReactNode } from 'react';
import type { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { ACCOUNT_ROLES, type AccountRole } from '@/features/auth/roles';

export interface AccountProfile {
  id: string;
  role: AccountRole;
  email: string | null;
  is_active: boolean;
  full_name: string | null;
  company_name: string | null;
  country: string | null;
  phone: string | null;
  customer_type: string | null;
}

export interface AuthState {
  status: 'loading' | 'signed_out' | 'signed_in';
  session: Session | null;
  user: User | null;
  profile: AccountProfile | null;
  profileError: boolean;
  refreshProfile: () => Promise<void>;
  signOut: () => Promise<void>;
}

export const AuthContext = createContext<AuthState | null>(null);

type ProfileResult = { ok: true; profile: AccountProfile } | { ok: false };

const PROFILE_COLUMNS = 'id, role, email, is_active, full_name, company_name, country, phone, customer_type';

async function fetchProfile(userId: string): Promise<ProfileResult> {
  const { data, error } = await supabase
    .from('profiles')
    .select(PROFILE_COLUMNS)
    .eq('id', userId)
    .maybeSingle();

  if (error) return { ok: false };
  if (!data) {
    return {
      ok: true,
      profile: { id: userId, role: 'customer', email: null, is_active: true, full_name: null, company_name: null, country: null, phone: null, customer_type: null },
    };
  }
  if (!ACCOUNT_ROLES.includes(data.role as AccountRole)) return { ok: false };
  return { ok: true, profile: data as AccountProfile };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<AuthState['status']>('loading');
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<AccountProfile | null>(null);
  const [profileError, setProfileError] = useState(false);

  useEffect(() => {
    let active = true;

    const applySession = async (next: Session | null) => {
      if (!active) return;
      setSession(next);
      if (!next) {
        setProfile(null);
        setProfileError(false);
        setStatus('signed_out');
        return;
      }
      const result = await fetchProfile(next.user.id);
      if (!active) return;
      setProfile(result.ok ? result.profile : null);
      setProfileError(!result.ok);
      setStatus('signed_in');
    };

    supabase.auth.getSession().then(({ data }) => {
      void applySession(data.session);
    });

    // Deferred so no Supabase call runs inside the auth callback (avoids a supabase-js lock).
    const { data: subscription } = supabase.auth.onAuthStateChange((_event, next) => {
      setTimeout(() => void applySession(next), 0);
    });

    return () => {
      active = false;
      subscription.subscription.unsubscribe();
    };
  }, []);

  const refreshProfile = async () => {
    if (!session) return;
    const result = await fetchProfile(session.user.id);
    setProfile(result.ok ? result.profile : null);
    setProfileError(!result.ok);
  };

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider
      value={{
        status,
        session,
        user: session?.user ?? null,
        profile,
        profileError,
        refreshProfile,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
