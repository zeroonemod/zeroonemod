export type AccountRole = 'customer' | 'partner' | 'admin';

export const ACCOUNT_ROLES: readonly AccountRole[] = ['customer', 'partner', 'admin'];

export function homeForRole(role: AccountRole): string {
  return role === 'admin' ? '/admin' : '/dashboard';
}
