import { resolveCourseAccess } from '@/src/domain/courseAccess';
import { coursePremiumPlanIsValid } from '@/src/domain/coursePremium';
import type { Course, CourseEntitlement, Viewer } from '@/src/domain/models';

export interface CourseReviewEligibility {
  canReview: boolean;
  reasonMessage: string | null;
}

export function resolveCourseReviewEligibility(
  viewer: Viewer | null,
  course: Pick<Course, 'status' | 'creatorUserId' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  activeEntitlement: CourseEntitlement | null
): CourseReviewEligibility {
  if (!viewer) {
    return {
      canReview: false,
      reasonMessage: 'Sign in to add a rating and review.',
    };
  }

  if (viewer.profile.isBanned) {
    return {
      canReview: false,
      reasonMessage: 'Blocked accounts cannot submit course reviews.',
    };
  }

  if (course.status !== 'published') {
    return {
      canReview: false,
      reasonMessage: 'Reviews are available after the course is published.',
    };
  }

  if (viewer.user.id === course.creatorUserId) {
    return {
      canReview: false,
      reasonMessage: 'You cannot rate or review your own course.',
    };
  }

  if (!coursePremiumPlanIsValid(course)) {
    return {
      canReview: true,
      reasonMessage: null,
    };
  }

  const access = resolveCourseAccess(viewer, course, activeEntitlement);
  if (access.viewerCanAccessPremium) {
    return {
      canReview: true,
      reasonMessage: null,
    };
  }

  return {
    canReview: false,
    reasonMessage: 'Unlock this course to add a rating and review.',
  };
}


