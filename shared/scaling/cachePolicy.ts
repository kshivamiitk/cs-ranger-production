export type CachePolicy = {
  ttlSeconds: number;
  staleWhileRevalidateSeconds?: number;
  scope: 'public' | 'user' | 'creator' | 'admin';
};

export const CachePolicies = {
  publicCoursePage: { ttlSeconds: 300, staleWhileRevalidateSeconds: 120, scope: 'public' },
  courseModuleTree: { ttlSeconds: 300, staleWhileRevalidateSeconds: 120, scope: 'public' },
  userEntitlement: { ttlSeconds: 60, scope: 'user' },
  learnerDashboard: { ttlSeconds: 30, scope: 'user' },
  unseenNotificationCount: { ttlSeconds: 15, scope: 'user' },
  creatorDashboardSummary: { ttlSeconds: 60, scope: 'creator' },
} satisfies Record<string, CachePolicy>;



