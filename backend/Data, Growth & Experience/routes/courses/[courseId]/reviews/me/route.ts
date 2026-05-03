import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { courseReviewUpsertSchema } from '@/src/presentation/schemas';
import { invalidatePublicCourseReviewsCache } from '@/shared/performance/courseReviewCache';

export async function PUT(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = courseReviewUpsertSchema.parse(await request.json());
    const { authService, courseReviewService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const review = await courseReviewService.upsertCourseReview(viewer, courseId, parsed);
    invalidatePublicCourseReviewsCache(courseId);
    return ok({ review });
  } catch (error) {
    return failure(error);
  }
}

