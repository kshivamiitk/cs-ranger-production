import { formatCurrency } from '@/lib/utils';
import { deriveCoursePremiumState } from '@/src/domain/coursePremium';
import type { Course, CoursePremiumState } from '@/src/domain/models';

export function describeCoursePremiumState(
  course: Pick<Course, 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  premiumNodeCount: number
): {
  state: CoursePremiumState;
  label: string;
  tone: 'success' | 'primary' | 'warning';
  helper: string;
} {
  const state = deriveCoursePremiumState(course, premiumNodeCount);

  switch (state) {
    case 'premium_ready':
      return {
        state,
        label: `${formatCurrency(course.priceAmount)} · ${course.premiumAccessDays ?? 0} days`,
        tone: 'primary',
        helper: `${premiumNodeCount} premium node${premiumNodeCount === 1 ? '' : 's'} use the active course plan.`,
      };
    case 'pricing_incomplete':
      return {
        state,
        label: 'Pricing incomplete',
        tone: 'warning',
        helper: `${premiumNodeCount} premium node${premiumNodeCount === 1 ? '' : 's'} exist, but price or duration is not publish-ready yet.`,
      };
    default:
      return {
        state,
        label: 'Free course',
        tone: 'success',
        helper: 'All visible nodes are currently free to open.',
      };
  }
}


