import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService, courseReviewQueryService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext('dark');
    const reviews = await courseReviewQueryService.getCourseReviewsView(viewer, courseId);
    return ok({ reviews });
  } catch (error) {
    return failure(error);
  }
}


