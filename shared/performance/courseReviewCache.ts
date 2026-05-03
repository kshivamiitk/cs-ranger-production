import { cachedValue, invalidateCacheByPrefix, stableCacheKey } from './apiCache';

export const publicCourseReviewsCacheMs = Number(process.env.DGX_PUBLIC_COURSE_REVIEWS_CACHE_MS ?? 30_000);

export function publicCourseReviewsCacheKey(courseId: string) {
  return stableCacheKey(['dgx', 'course-reviews', 'public', courseId]);
}

export function cachedPublicCourseReviews<T>(courseId: string, producer: () => Promise<T>) {
  return cachedValue(publicCourseReviewsCacheKey(courseId), publicCourseReviewsCacheMs, producer);
}

export function invalidatePublicCourseReviewsCache(courseId?: string | null) {
  return invalidateCacheByPrefix(
    courseId ? publicCourseReviewsCacheKey(courseId) : stableCacheKey(['dgx', 'course-reviews'])
  );
}
