import { createServerContainer } from '@/src/infrastructure/container/server';
import { invalidateLearnerCreatorReadCaches } from '@/src/performance/learnerCreatorCache';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { courseReviewUpsertSchema } from '@/src/presentation/schemas';

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
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ review });
  } catch (error) {
    return failure(error);
  }
}

