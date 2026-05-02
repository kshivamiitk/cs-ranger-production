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
  theme: { windowSeconds: 60, maxRequests: 90 },
  search: { windowSeconds: 60, maxRequests: 120 },
  latexPreview: { windowSeconds: 60, maxRequests: 20 },
  admin: { windowSeconds: 60, maxRequests: 180 },
} satisfies Record<string, RateLimitPolicy>;


