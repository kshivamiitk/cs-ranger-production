import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { defaultTheme } from '@/lib/constants';
import { cachedValue } from '@/shared/performance/apiCache';
import { learnerCreatorCacheKey, learnerCreatorCacheTtlMs } from '@/src/performance/learnerCreatorCache';

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService, catalogService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext(defaultTheme);
    const cacheKey = learnerCreatorCacheKey(['course', courseId, 'detail', viewer?.user.id ?? 'guest']);
    const payload = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.courseDetail, async () => {
      const courseView = await catalogService.getCourseTreeView(viewer, courseId);
      return { course: courseView.course, overview: courseView.overview, access: courseView.access };
    });
    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}
