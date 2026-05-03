import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok, privateApiCacheHeaders, publicApiCacheHeaders } from '@/src/presentation/http/routeUtils';
import { cachedPublicCourseReviews } from '@/shared/performance/courseReviewCache';

function isAnonymousRequest(request: Request) {
  return !request.headers.get('cookie') && !request.headers.get('authorization');
}

export async function GET(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;

    if (isAnonymousRequest(request)) {
      const payload = await cachedPublicCourseReviews(courseId, async () => {
        const { courseReviewQueryService } = await createServerContainer();
        const reviews = await courseReviewQueryService.getCourseReviewsView(null, courseId);
        return { reviews };
      });

      return ok(payload, {
        headers: publicApiCacheHeaders({ sMaxAge: 30, staleWhileRevalidate: 120 }),
      });
    }

    const { authService, courseReviewQueryService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext('dark');
    const reviews = await courseReviewQueryService.getCourseReviewsView(viewer, courseId);
    return ok({ reviews }, { headers: privateApiCacheHeaders() });
  } catch (error) {
    return failure(error);
  }
}

