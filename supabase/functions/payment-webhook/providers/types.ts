/** What every payment provider adapter must return once a webhook is verified. */
export interface VerifiedPayment {
  /** Job reference (ZOM-000001) passed to the provider as metadata or order id when the link was created. */
  jobReference: string;
  amount: number;
  currency: string;
  /** Provider transaction id. Stored as payments.provider_reference and used to ignore duplicates. */
  providerReference: string;
}

export interface PaymentProvider {
  name: 'stripe' | 'redsys';
  /** Verifies the signature and returns the payment, or null for events that are not a completed payment. */
  verify(req: Request): Promise<VerifiedPayment | null>;
}
