export type AccountRole = 'customer' | 'partner' | 'staff' | 'admin';

export const ACCOUNT_ROLES: readonly AccountRole[] = ['customer', 'partner', 'staff', 'admin'];

/** Admin and staff work in the admin panel; staff with limited access. */
export function isTeamRole(role: AccountRole): boolean {
  return role === 'admin' || role === 'staff';
}

export function homeForRole(role: AccountRole): string {
  return isTeamRole(role) ? '/admin' : '/dashboard';
}
