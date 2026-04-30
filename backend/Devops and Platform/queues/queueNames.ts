export const QueueNames = {
  certificateGeneration: 'certificate-generation',
  analyticsEvents: 'analytics-events',
  notificationFanout: 'notification-fanout',
  emailDelivery: 'email-delivery',
  payoutSettlement: 'payout-settlement',
  searchIndexing: 'search-indexing',
  progressFlush: 'progress-flush',
} as const;

export type QueueName = (typeof QueueNames)[keyof typeof QueueNames];



