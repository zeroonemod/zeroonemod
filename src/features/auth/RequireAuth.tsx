import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { homeForRole, isTeamRole } from '@/features/auth/roles';
import { ForcePasswordChange } from '@/features/auth/ForcePasswordChange';
import { LoadingState } from '@/components/ui/LoadingState';

interface RequireAuthProps {
  children: ReactNode;
  /** 'team': admin or staff (admin panel). 'admin': admin only (settings, customers, partners, FAQ). */
  access?: 'any' | 'team' | 'admin';
}

export function RequireAuth({ children, access = 'any' }: RequireAuthProps) {
  const { status, profile, profileError } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingState label="Checking your session" />;

  if (status === 'signed_out' || status === 'mfa_required') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profileError || !profile) {
    return <LoadingState label="We could not load your account. Please refresh the page." />;
  }

  // Accounts created with a temporary password (staff) choose their own first.
  if (profile.must_change_password) return <ForcePasswordChange />;

  if (access === 'team' && !isTeamRole(profile.role)) return <Navigate to={homeForRole(profile.role)} replace />;
  if (access === 'admin' && profile.role !== 'admin') return <Navigate to={homeForRole(profile.role)} replace />;

  return <>{children}</>;
}

/** Inside the admin panel: pages only the admin may open. Staff are sent back to the dashboard. */
export function AdminOnly({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  if (profile?.role !== 'admin') return <Navigate to="/admin" replace />;
  return <>{children}</>;
}

export function useIsAdmin(): boolean {
  return useAuth().profile?.role === 'admin';
}
