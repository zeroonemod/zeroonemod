import type { PaymentProvider } from './types.ts';

// Placeholder. To enable: set PAYMENT_PROVIDER=redsys, REDSYS_MERCHANT_CODE, REDSYS_TERMINAL and
// REDSYS_SECRET_KEY, verify Ds_Signature (HMAC SHA-256 with the 3DES-derived order key), accept
// Ds_Response 0000 to 0099 and map Ds_Order back to the job reference.
export const redsysProvider: PaymentProvider = {
  name: 'redsys',
  verify() {
    throw new Error('Redsys webhook is not configured yet.');
  },
};
