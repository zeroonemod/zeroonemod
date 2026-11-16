// Future automatic payments. Disabled until PAYMENT_PROVIDER is set.
// When a provider confirms a payment, the job is marked as paid through the same
// database function the admin "Mark as paid" button uses (apply_payment).
import { adminClient } from '../_shared/supabase.ts';
import type { PaymentProvider } from './providers/types.ts';
import { stripeProvider } from './providers/stripe.ts';
import { redsysProvider } from './providers/redsys.ts';

const PROVIDERS: Record<string, PaymentProvider> = { stripe: stripeProvider, redsys: redsysProvider };

Deno.serve(async (req) => {
  if (req.method !== 'POST') return new Response('Method not allowed', { status: 405 });

  const provider = PROVIDERS[Deno.env.get('PAYMENT_PROVIDER') ?? ''];
  if (!provider) return new Response('Payment provider not configured', { status: 501 });

  try {
    const payment = await provider.verify(req);
    if (!payment) return new Response('ignored', { status: 200 });

    const admin = adminClient();
    const { data: job } = await admin.from('jobs').select('id, payment_status').eq('reference', payment.jobReference).maybeSingle();
    if (!job) return new Response('unknown job', { status: 200 });
    if (job.payment_status === 'paid') return new Response('already paid', { status: 200 });

    const { error } = await admin.rpc('apply_payment', {
      p_job: job.id,
      p_amount: payment.amount,
      p_currency: payment.currency.toUpperCase(),
      p_method: 'card_link',
      p_reference: null,
      p_paid_at: new Date().toISOString(),
      p_provider: provider.name,
      p_provider_reference: payment.providerReference,
      p_actor: null,
    });
    if (error) throw error;
    return new Response('ok', { status: 200 });
  } catch (error) {
    console.error('payment-webhook failed', error);
    return new Response('error', { status: 400 });
  }
});
