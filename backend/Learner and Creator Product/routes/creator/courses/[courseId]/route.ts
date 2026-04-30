import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { courseSchema } from '@/src/presentation/schemas';
import { cachedValue } from '@/shared/performance/apiCache';
import {
  invalidateLearnerCreatorReadCaches,
  learnerCreatorCacheKey,
  learnerCreatorCacheTtlMs,
} from '@/src/performance/learnerCreatorCache';

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const cacheKey = learnerCreatorCacheKey(['creator-course-detail', viewer.user.id, courseId]);
    const payload = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.creatorCourseDetail, async () => ({
      course: await courseBuilderService.getCreatorCourseDetail(viewer, courseId),
    }));
    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = courseSchema.parse(await request.json());
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const course = await courseBuilderService.updateCourse(viewer, { courseId, ...parsed });
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ course });
  } catch (error) {
    return failure(error);
  }
}
