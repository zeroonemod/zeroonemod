import type { AccountProfile } from '@/features/auth/AuthContext';
import type { CustomerType, WizardForm } from '@/features/submission/types';

export function accountDetailsFor(email: string, profile: AccountProfile): Pick<WizardForm, 'firstName' | 'lastName' | 'email' | 'country' | 'customerType' | 'companyName' | 'phone' | 'password'> | null {
  const [firstName = '', ...rest] = (profile.full_name ?? '').trim().split(/\s+/);
  const lastName = rest.join(' ');
  const customerType = profile.customer_type;
  const isComplete =
    Boolean(firstName && lastName && email && profile.country) &&
    (customerType === 'individual' || (customerType === 'workshop' && Boolean(profile.company_name)));
  if (!isComplete) return null;

  return {
    firstName,
    lastName,
    email: email.trim().toLowerCase(),
    country: profile.country ?? '',
    customerType: customerType as CustomerType,
    companyName: profile.company_name ?? '',
    phone: profile.phone ?? '',
    password: '',
  };
}
