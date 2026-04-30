import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { courseSchema } from '@/src/presentation/schemas';
import { cachedValue } from '@/shared/performance/apiCache';
import {
  invalidateLearnerCreatorReadCaches,
  learnerCreatorCacheKey,
  learnerCreatorCacheTtlMs,
} from '@/src/performance/learnerCreatorCache';

export async function GET() {
  try {
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const cacheKey = learnerCreatorCacheKey(['creator', viewer.user.id, 'courses']);
    const payload = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.creatorCourses, async () => ({
      courses: await courseBuilderService.listCreatorCourses(viewer),
    }));
    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(request: Request) {
  try {
    const parsed = courseSchema.parse(await request.json());
    const { authService, courseBuilderService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const course = await courseBuilderService.createCourse(viewer, parsed);
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId: course.id });
    return ok({ course });
  } catch (error) {
    return failure(error);
  }
}
