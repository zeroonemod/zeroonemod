import type { PaymentProvider } from './types.ts';

// Placeholder. To enable: set PAYMENT_PROVIDER=stripe, STRIPE_SECRET_KEY and STRIPE_WEBHOOK_SECRET,
// verify the "stripe-signature" header with the Stripe SDK (constructEventAsync), handle
// "checkout.session.completed" and read the job reference from session.metadata.job_reference.
export const stripeProvider: PaymentProvider = {
  name: 'stripe',
  verify() {
    throw new Error('Stripe webhook is not configured yet.');
  },
};
