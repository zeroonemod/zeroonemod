import type { AccountProfile } from '@/features/auth/AuthContext';
import type { CustomerType, WizardForm } from '@/features/submission/types';

type AccountFields = Pick<WizardForm, 'firstName' | 'lastName' | 'email' | 'country' | 'customerType' | 'companyName' | 'phone'>;

/** Splits the saved profile into wizard fields. */
export function profileToForm(email: string, profile: AccountProfile): AccountFields {
  const [firstName = '', ...rest] = (profile.full_name ?? '').trim().split(/\s+/);
  const customerType: CustomerType | '' =
    profile.role === 'partner' ? 'workshop' : profile.customer_type === 'individual' || profile.customer_type === 'workshop' ? profile.customer_type : '';
  return {
    firstName,
    lastName: rest.join(' '),
    email: email.trim().toLowerCase(),
    country: profile.country ?? '',
    customerType,
    companyName: profile.company_name ?? '',
    phone: profile.phone ?? '',
  };
}

/** True when the profile has everything step 3 asks for, so a signed-in customer only confirms. */
export function isProfileComplete(fields: AccountFields): boolean {
  return (
    Boolean(fields.firstName && fields.lastName && fields.email && fields.country && fields.customerType) &&
    (fields.customerType === 'individual' || Boolean(fields.companyName))
  );
}
