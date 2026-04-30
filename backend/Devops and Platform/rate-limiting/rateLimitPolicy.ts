export type RateLimitPolicy = {
  windowSeconds: number;
  maxRequests: number;
};

export const RateLimitPolicies = {
  publicRead: { windowSeconds: 60, maxRequests: 300 },
  authenticatedRead: { windowSeconds: 60, maxRequests: 900 },
  writeAction: { windowSeconds: 60, maxRequests: 120 },
  paymentWebhook: { windowSeconds: 60, maxRequests: 600 },
  auth: { windowSeconds: 60, maxRequests: 30 },
} satisfies Record<string, RateLimitPolicy>;



