import type { Course, CoursePremiumState } from '@/src/domain/models';

export function coursePremiumPlanIsValid(
  course: Pick<Course, 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>
) {
  return Boolean(course.premiumEnabled && course.priceAmount > 0 && course.premiumAccessDays && course.premiumAccessDays > 0);
}

export function deriveCoursePremiumState(
  course: Pick<Course, 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  premiumNodeCount: number
): CoursePremiumState {
  if (coursePremiumPlanIsValid(course)) {
    return 'premium_ready';
  }

  if (premiumNodeCount > 0) {
    return 'pricing_incomplete';
  }

  return 'free';
}

export function courseRequiresPremiumPlan(
  course: Pick<Course, 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  premiumNodeCount: number
) {
  return deriveCoursePremiumState(course, premiumNodeCount) !== 'free';
}


