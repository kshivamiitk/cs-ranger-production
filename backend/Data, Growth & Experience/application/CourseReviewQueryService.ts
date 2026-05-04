import { ApplicationError, requireValue } from '@/src/application/errors';
import { resolveCourseReviewEligibility } from '@/src/domain/courseReviewAccess';
import { learnerCreatorCacheKey } from '@/src/performance/learnerCreatorCache';
import { cachedValue } from '@/shared/performance/apiCache';
import type { CourseRepository, CourseReviewRepository, FinanceRepository } from '@/src/domain/ports';
import type { Course, CourseEntitlement, CourseReviewsView, Viewer } from '@/src/domain/models';

type ReviewableCourse = Pick<
  Course,
  'id' | 'status' | 'creatorUserId' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'
>;

export class CourseReviewQueryService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly courseReviewRepository: CourseReviewRepository,
    private readonly financeRepository: FinanceRepository
  ) {}

  async getCourseReviewsView(viewer: Viewer | null, courseId: string): Promise<CourseReviewsView> {
    const course = requireValue(
      await cachedValue(
        learnerCreatorCacheKey(['course', courseId, 'reviewable']),
        30_000,
        () => this.courseRepository.getCourseById(courseId),
        { staleMs: 60_000 }
      ),
      'Course not found.',
      404
    );
    const activeEntitlement = viewer
      ? await this.financeRepository.getActiveEntitlement({ learnerUserId: viewer.user.id, courseId })
      : null;

    return this.buildCourseReviewsView(viewer, course, activeEntitlement);
  }

  async getCourseReviewsViewForCourse(
    viewer: Viewer | null,
    course: ReviewableCourse,
    activeEntitlement: CourseEntitlement | null
  ): Promise<CourseReviewsView> {
    return this.buildCourseReviewsView(viewer, course, activeEntitlement);
  }

  private async buildCourseReviewsView(
    viewer: Viewer | null,
    course: ReviewableCourse,
    activeEntitlement: CourseEntitlement | null
  ): Promise<CourseReviewsView> {
    const viewerOwnsCourse = Boolean(viewer && viewer.user.id === course.creatorUserId);
    const viewerIsAdmin = Boolean(viewer?.profile.isAdmin);

    if (course.status !== 'published' && !viewerOwnsCourse && !viewerIsAdmin) {
      throw new ApplicationError('Course not found.', 404);
    }

    const eligibility = resolveCourseReviewEligibility(viewer, course, activeEntitlement);

    const [reviewPayload, ownReview] = await Promise.all([
      cachedValue(
        learnerCreatorCacheKey(['course', course.id, 'reviews', viewer?.user.id ?? 'guest']),
        15_000,
        async () => {
          const [summary, reviews] = await Promise.all([
            this.courseReviewRepository.getCourseReviewSummary(course.id),
            this.courseReviewRepository.listCourseReviews({
              courseId: course.id,
              viewerUserId: viewer?.user.id ?? null,
            }),
          ]);

          return { summary, reviews };
        },
        { staleMs: 15_000 }
      ),
      viewer
        ? this.courseReviewRepository.getReviewerReviewForCourse(course.id, viewer.user.id)
        : Promise.resolve(null),
    ]);

    return {
      courseId: course.id,
      summary: reviewPayload.summary,
      reviews: reviewPayload.reviews,
      ownReview,
      canReview: eligibility.canReview,
      canReviewReason: eligibility.canReview
        ? null
        : eligibility.reasonMessage ?? 'You are not eligible to review this course.',
    };
  }
}
