import { premiumPaymentMessages } from '@/lib/payments';
import { coursePremiumPlanIsValid } from '@/src/domain/coursePremium';
import type {
  Course,
  CourseAccessState,
  CourseEntitlement,
  CourseNodePreview,
  Viewer,
} from '@/src/domain/models';

function entitlementIsActive(entitlement: CourseEntitlement | null, now = new Date()) {
  if (!entitlement || entitlement.status !== 'active') {
    return false;
  }

  return new Date(entitlement.expiresAt).getTime() > now.getTime();
}

function viewerHasPremiumNodeBypass(
  viewer: Viewer | null,
  course: Pick<Course, 'creatorUserId'>
) {
  return Boolean(viewer && (viewer.user.id === course.creatorUserId || viewer.profile.isAdmin));
}

function viewerHasPremiumNodeAccess(
  viewer: Viewer | null,
  course: Pick<Course, 'creatorUserId'>,
  activeEntitlement: CourseEntitlement | null
) {
  return viewerHasPremiumNodeBypass(viewer, course) || entitlementIsActive(activeEntitlement);
}

export function coursePremiumIsFree(course: Pick<Course, 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>) {
  return !coursePremiumPlanIsValid(course);
}

export function resolveCourseAccess(
  viewer: Viewer | null,
  course: Pick<Course, 'creatorUserId' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  activeEntitlement: CourseEntitlement | null
): CourseAccessState {
  const isOwner = Boolean(viewer && viewer.user.id === course.creatorUserId);
  const viewerIsAdmin = Boolean(viewer?.profile.isAdmin);
  const courseIsFree = coursePremiumIsFree(course);
  const hasActiveEntitlement = entitlementIsActive(activeEntitlement);
  const viewerCanAccessPremium = isOwner || viewerIsAdmin || courseIsFree || hasActiveEntitlement;
  const canPurchasePremium =
    Boolean(viewer) &&
    !isOwner &&
    !viewerIsAdmin &&
    coursePremiumPlanIsValid(course) &&
    !hasActiveEntitlement;
  const canRenewPremium =
    Boolean(viewer) &&
    !isOwner &&
    !viewerIsAdmin &&
    coursePremiumPlanIsValid(course) &&
    hasActiveEntitlement;

  let gateReason: CourseAccessState['gateReason'] = null;
  let gateMessage: string | null = null;

  if (!viewerCanAccessPremium && coursePremiumPlanIsValid(course)) {
    if (!viewer) {
      gateReason = 'login_required';
      gateMessage = premiumPaymentMessages.loginRequired;
    } else {
      gateReason = 'premium_purchase_required';
      gateMessage = premiumPaymentMessages.purchaseRequired;
    }
  }

  return {
    isOwner,
    premiumEnabled: course.premiumEnabled,
    courseIsFree,
    hasActiveEntitlement,
    activeEntitlement: hasActiveEntitlement ? activeEntitlement : null,
    viewerCanAccessPremium,
    canPurchasePremium,
    canRenewPremium,
    gateReason,
    gateMessage,
  };
}

export function canAccessNodeContent(
  viewer: Viewer | null,
  course: Pick<Course, 'creatorUserId' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  node: Pick<CourseNodePreview, 'isPremium'>,
  activeEntitlement: CourseEntitlement | null
) {
  if (!node.isPremium) {
    return true;
  }

  return viewerHasPremiumNodeAccess(viewer, course, activeEntitlement);
}

export function nodeIsLocked(
  viewer: Viewer | null,
  course: Pick<Course, 'creatorUserId' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
  node: Pick<CourseNodePreview, 'isPremium'>,
  activeEntitlement: CourseEntitlement | null
) {
  return !canAccessNodeContent(viewer, course, node, activeEntitlement);
}


