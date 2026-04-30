import { coursePremiumPlanIsValid } from '@/src/domain/coursePremium';
import type { Course, ModuleWithNodes } from '@/src/domain/models';

export const CREATOR_FREE_COURSE_LIMIT = 3;
export const PREMIUM_COURSE_FREE_NODE_LIMIT = 5;

export type CoursePricingPolicyInput = Pick<
  Course,
  'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'
>;

export function courseCountsAsFree(course: CoursePricingPolicyInput) {
  return !coursePremiumPlanIsValid(course);
}

export function courseCountsAsPremium(course: CoursePricingPolicyInput) {
  return coursePremiumPlanIsValid(course);
}

export function countFreeNodes(modules: Array<Pick<ModuleWithNodes, 'nodes'>>, excludeNodeId?: string) {
  return modules.reduce(
    (sum, module) =>
      sum + module.nodes.filter((node) => !node.isPremium && node.id !== excludeNodeId).length,
    0
  );
}

