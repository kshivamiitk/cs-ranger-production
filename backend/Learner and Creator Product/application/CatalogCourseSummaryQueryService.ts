import { resolveCourseAccess } from '@/src/domain/courseAccess';
import { viewerCanUseWishlist } from '@/src/domain/learnerProgress';
import type {
  CatalogCourseSummary,
  CourseOverview,
  Viewer,
} from '@/src/domain/models';
import type { FinanceRepository } from '@/src/domain/ports';
import { LearnerProgressQueryService } from '@/src/application/LearnerProgressQueryService';
import { WishlistQueryService } from '@/src/application/WishlistQueryService';

export class CatalogCourseSummaryQueryService {
  constructor(
    private readonly financeRepository: FinanceRepository,
    private readonly learnerProgressQueryService: LearnerProgressQueryService,
    private readonly wishlistQueryService: WishlistQueryService
  ) {}

  async buildSummaries(viewer: Viewer | null, courseOverviews: CourseOverview[]): Promise<CatalogCourseSummary[]> {
    if (courseOverviews.length === 0) {
      return [];
    }

    // Fast path for guests, creators, and admins. They do not need learner progress or wishlist state
    // on the public catalog, so avoid loading every course tree just to derive progress numbers.
    if (!viewer || viewer.profile.isAdmin || viewer.profile.primaryRole !== 'learner') {
      return courseOverviews.map((course) => this.buildSummaryWithoutLearnerState(viewer, course));
    }

    const courseIds = courseOverviews.map((course) => course.id);
    const [entitlementMap, wishlistStateMap] = await Promise.all([
      this.loadEntitlementMap(viewer, courseIds),
      this.wishlistQueryService.getWishlistStateMap(viewer, courseIds),
    ]);
    const accessByCourseId = new Map(
      courseOverviews.map((course) => [
        course.id,
        resolveCourseAccess(viewer, course, entitlementMap.get(course.id) ?? null),
      ])
    );
    const progressMap = await this.learnerProgressQueryService.getCatalogProgressMap(
      viewer,
      courseOverviews.map((course) => ({
        ...course,
        access: accessByCourseId.get(course.id) ?? resolveCourseAccess(viewer, course, null),
      }))
    );

    return courseOverviews.map((course) => {
      const access = accessByCourseId.get(course.id) ?? resolveCourseAccess(viewer, course, null);
      const progress = progressMap.get(course.id) ?? null;
      const wishlistState = wishlistStateMap.get(course.id);
      const canWishlist = viewerCanUseWishlist(viewer) && viewer?.user.id !== course.creatorUserId;

      return {
        ...course,
        access,
        progress,
        wishlist: {
          courseId: course.id,
          isWishlisted: wishlistState?.isWishlisted ?? false,
          wishlistCount: course.engagement.wishlistCount,
          canWishlist,
        },
      } satisfies CatalogCourseSummary;
    });
  }

  private buildSummaryWithoutLearnerState(viewer: Viewer | null, course: CourseOverview): CatalogCourseSummary {
    return {
      ...course,
      access: resolveCourseAccess(viewer, course, null),
      progress: null,
      wishlist: {
        courseId: course.id,
        isWishlisted: false,
        wishlistCount: course.engagement.wishlistCount,
        canWishlist: false,
      },
    } satisfies CatalogCourseSummary;
  }

  private async loadEntitlementMap(viewer: Viewer | null, courseIds: string[]) {
    if (!viewer || courseIds.length === 0) {
      return new Map<string, null>();
    }

    const entitlements = await this.financeRepository.listActiveEntitlements({
      learnerUserId: viewer.user.id,
      courseIds,
    });

    return new Map(entitlements.map((entitlement) => [entitlement.courseId, entitlement]));
  }
}
