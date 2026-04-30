import type { PaymentProvider, PaymentStatus, PremiumPurchaseKind } from '@/src/domain/models';

export const paymentProviders = {
  sandbox: 'sandbox',
  razorpay: 'razorpay',
} as const satisfies Record<string, PaymentProvider>;

export const paymentStatuses = {
  pending: 'pending',
  paid: 'paid',
  failed: 'failed',
  cancelled: 'cancelled',
  refunded: 'refunded',
} as const satisfies Record<string, PaymentStatus>;

export const premiumPurchaseKinds = {
  initial: 'initial',
  renewal: 'renewal',
} as const satisfies Record<string, PremiumPurchaseKind>;

export const premiumPaymentDefaults = {
  platformFeePercent: 20,
  minimumPlatformFeePercent: 20,
  minimumWithdrawalAmount: 500,
  settlementHoldDays: 0,
  currency: 'INR',
} as const;

export const premiumPaymentMessages = {
  loginRequired: 'Log in to unlock premium nodes for this course.',
  purchaseRequired: 'Purchase premium access to unlock premium nodes for this course.',
  freeCourse: 'This course currently exposes every node without premium gating.',
} as const;


