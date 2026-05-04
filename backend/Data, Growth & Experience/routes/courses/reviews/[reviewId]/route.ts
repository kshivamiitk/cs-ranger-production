import { createServerContainer } from '@/src/infrastructure/container/server';
import { invalidateLearnerCreatorReadCaches } from '@/src/performance/learnerCreatorCache';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ reviewId: string }> }
) {
  try {
    const { reviewId } = await context.params;
    const { authService, courseReviewService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const review = await courseReviewService.softDeleteOwnReview(viewer, reviewId);
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId: review.courseId });
    return ok({ review });
  } catch (error) {
    return failure(error);
  }
}

