import { ApplicationError } from '@/src/application/errors';
import { resolveCourseReviewEligibility } from '@/src/domain/courseReviewAccess';
import type { CourseRepository, CourseReviewRepository, FinanceRepository } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class CourseReviewApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly courseReviewRepository: CourseReviewRepository,
    private readonly financeRepository: FinanceRepository
  ) {}

  async upsertCourseReview(
    viewer: Viewer,
    courseId: string,
    input: { rating: number; reviewText: string | null }
  ) {
    if (!Number.isInteger(input.rating) || input.rating < 1 || input.rating > 5) {
      throw new ApplicationError('Rating must be an integer between 1 and 5.', 400);
    }

    const course = await this.courseRepository.getCourseById(courseId);
    if (!course) {
      throw new ApplicationError('Course not found.', 404);
    }

    const activeEntitlement = await this.financeRepository.getActiveEntitlement({
      learnerUserId: viewer.user.id,
      courseId,
    });
    const eligibility = resolveCourseReviewEligibility(viewer, course, activeEntitlement);

    if (!eligibility.canReview) {
      throw new ApplicationError(eligibility.reasonMessage ?? 'You are not eligible to review this course.', 403);
    }

    return this.courseReviewRepository.upsertCourseReview({
      courseId,
      reviewerUserId: viewer.user.id,
      rating: input.rating,
      reviewText: input.reviewText,
    });
  }

  async softDeleteOwnReview(viewer: Viewer, reviewId: string) {
    return this.courseReviewRepository.softDeleteCourseReview(reviewId, viewer.user.id);
  }
}


