import type { ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/features/auth/useAuth';
import { homeForRole } from '@/features/auth/roles';
import { LoadingState } from '@/components/ui/LoadingState';

interface RequireAuthProps {
  children: ReactNode;
  adminOnly?: boolean;
}

export function RequireAuth({ children, adminOnly = false }: RequireAuthProps) {
  const { status, profile, profileError } = useAuth();
  const location = useLocation();

  if (status === 'loading') return <LoadingState label="Checking your session" />;

  if (status === 'signed_out' || status === 'mfa_required') {
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  }

  if (profileError || !profile) {
    return <LoadingState label="We could not load your account. Please refresh the page." />;
  }

  if (adminOnly && profile.role !== 'admin') return <Navigate to={homeForRole(profile.role)} replace />;

  return <>{children}</>;
}
