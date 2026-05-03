export type IdempotencyKey = string;

export function createIdempotencyKey(parts: Array<string | number | null | undefined>): IdempotencyKey {
  return parts.filter((part) => part !== null && part !== undefined && String(part).length > 0).join(':');
}

export function createProviderWebhookEventKey(input: {
  provider: string;
  eventType?: string | null;
  providerOrderId?: string | null;
  providerPaymentId?: string | null;
  payoutId?: string | null;
  fallbackSignature?: string | null;
}) {
  return createIdempotencyKey([
    input.provider,
    input.eventType ?? 'event',
    input.providerPaymentId ?? input.payoutId ?? input.providerOrderId ?? input.fallbackSignature ?? 'unknown',
  ]);
}


