import { invalidateCacheByPrefix, stableCacheKey } from '@/shared/performance/apiCache';

export const learnerCreatorCacheTtlMs = {
  publicCourseList: Number(process.env.LCP_PUBLIC_COURSE_LIST_CACHE_MS ?? 120_000),
  signedCourseList: Number(process.env.LCP_SIGNED_COURSE_LIST_CACHE_MS ?? 30_000),
  courseDetail: Number(process.env.LCP_COURSE_DETAIL_CACHE_MS ?? 30_000),
  creatorCourses: Number(process.env.LCP_CREATOR_COURSES_CACHE_MS ?? 30_000),
  creatorCourseDetail: Number(process.env.LCP_CREATOR_COURSE_DETAIL_CACHE_MS ?? 20_000),
  creatorCollaboration: Number(process.env.LCP_CREATOR_COLLABORATION_CACHE_MS ?? 20_000),
  pricingPlans: Number(process.env.LCP_PRICING_PLANS_CACHE_MS ?? 45_000),
  incomingInvites: Number(process.env.LCP_INCOMING_INVITES_CACHE_MS ?? 15_000),
} as const;

export function learnerCreatorCacheKey(parts: Array<string | number | boolean | null | undefined>) {
  return stableCacheKey(['lcp', ...parts]);
}

export function invalidateLearnerCreatorReadCaches(input?: { userId?: string | null; courseId?: string | null }) {
  const removed = [
    invalidateCacheByPrefix('lcp:courses'),
    invalidateCacheByPrefix('lcp:pricing-plans'),
    input?.userId ? invalidateCacheByPrefix(learnerCreatorCacheKey(['creator', input.userId])) : 0,
    input?.courseId ? invalidateCacheByPrefix(learnerCreatorCacheKey(['course', input.courseId])) : 0,
    input?.courseId ? invalidateCacheByPrefix(learnerCreatorCacheKey(['creator-course-detail'])) : 0,
    input?.courseId ? invalidateCacheByPrefix(learnerCreatorCacheKey(['creator-collaboration'])) : 0,
  ].reduce((sum, value) => sum + value, 0);

  return removed;
}
