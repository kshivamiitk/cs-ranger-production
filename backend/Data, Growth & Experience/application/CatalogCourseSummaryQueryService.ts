import { nodeIsLocked, resolveCourseAccess } from '@/src/domain/courseAccess';
import { viewerCanUseWishlist } from '@/src/domain/learnerProgress';
import type {
  CatalogCourseSummary,
  CourseOverview,
  CourseTreeModule,
  Viewer,
} from '@/src/domain/models';
import type {
  CourseRepository,
  FinanceRepository,
} from '@/src/domain/ports';
import { LearnerProgressQueryService } from '@/src/application/LearnerProgressQueryService';
import { WishlistQueryService } from '@/src/application/WishlistQueryService';

export class CatalogCourseSummaryQueryService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly learnerProgressQueryService: LearnerProgressQueryService,
    private readonly wishlistQueryService: WishlistQueryService
  ) {}

  async buildSummaries(viewer: Viewer | null, courseOverviews: CourseOverview[]): Promise<CatalogCourseSummary[]> {
    if (courseOverviews.length === 0) {
      return [];
    }

    if (!viewer || viewer.profile.isAdmin || viewer.profile.primaryRole !== 'learner') {
      return courseOverviews.map((course) => this.buildSummaryWithoutLearnerState(viewer, course));
    }

    const courseIds = courseOverviews.map((course) => course.id);
    const [entitlementMap, trees, wishlistStateMap] = await Promise.all([
      this.loadEntitlementMap(viewer, courseIds),
      this.courseRepository.listCourseTreesByIds(courseIds),
      this.wishlistQueryService.getWishlistStateMap(viewer, courseIds),
    ]);
    const treeByCourseId = new Map(trees.map((tree) => [tree.id, tree]));
    const progressMap = await this.learnerProgressQueryService.getCourseProgressMap(
      viewer,
      courseOverviews.map((course) => ({
        id: course.id,
        modules: this.buildTreeModulesWithLockState(
          viewer,
          treeByCourseId.get(course.id)?.modules ?? [],
          course,
          entitlementMap.get(course.id) ?? null
        ),
      }))
    );

    return courseOverviews.map((course) => {
      const access = resolveCourseAccess(viewer, course, entitlementMap.get(course.id) ?? null);
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

  private buildTreeModulesWithLockState(
    viewer: Viewer | null,
    modules: Array<{
      id: string;
      courseId: string;
      title: string;
      summary: string;
      position: number;
      createdAt: string;
      updatedAt: string;
      nodes: Array<{
        id: string;
        moduleId: string;
        type: 'content' | 'html' | 'question' | 'quiz' | 'video' | 'pdf' | 'github';
        title: string;
        isPremium: boolean;
        excerpt: string | null;
        position: number;
        createdAt: string;
        updatedAt: string;
      }>;
    }>,
    course: Pick<CourseOverview, 'creatorUserId' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'>,
    entitlement: Awaited<ReturnType<FinanceRepository['getActiveEntitlement']>>
  ): CourseTreeModule[] {
    return modules.map((module) => ({
      ...module,
      nodes: module.nodes.map((node) => ({
        ...node,
        isLocked: nodeIsLocked(viewer, course, node, entitlement),
        isCompleted: false,
      })),
      accessibleNodeCount: 0,
      completedNodeCount: 0,
      completionPercent: 0,
    }));
  }
}

