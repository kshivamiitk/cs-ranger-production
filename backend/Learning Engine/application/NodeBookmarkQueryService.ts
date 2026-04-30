import { nodeIsLocked } from '@/src/domain/courseAccess';
import type {
  BookmarkedNodeView,
  CourseOverview,
  CourseTreeDetail,
  NodeBookmarkState,
  Viewer,
} from '@/src/domain/models';
import type {
  CourseRepository,
  FinanceRepository,
  NodeBookmarkRepository,
} from '@/src/domain/ports';

export class NodeBookmarkQueryService {
  constructor(
    private readonly nodeBookmarkRepository: NodeBookmarkRepository,
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository
  ) {}

  async getNodeBookmarkState(viewer: Viewer | null, input: { nodeId: string }): Promise<NodeBookmarkState> {
    if (!viewer || viewer.profile.isBanned) {
      return {
        nodeId: input.nodeId,
        isBookmarked: false,
        canBookmark: false,
      };
    }

    const bookmarkedNodeIds = await this.nodeBookmarkRepository.listBookmarkedNodeIds({
      learnerUserId: viewer.user.id,
      nodeIds: [input.nodeId],
    });

    return {
      nodeId: input.nodeId,
      isBookmarked: bookmarkedNodeIds.includes(input.nodeId),
      canBookmark: true,
    };
  }

  async getBookmarkedNodesView(viewer: Viewer | null): Promise<BookmarkedNodeView[]> {
    if (!viewer || viewer.profile.isBanned) {
      return [];
    }

    const entries = await this.nodeBookmarkRepository.listBookmarksByLearner(viewer.user.id);
    if (entries.length === 0) {
      return [];
    }

    const courseIds = Array.from(new Set(entries.map((entry) => entry.courseId)));
    const [courseTrees, courseOverviews, entitlements] = await Promise.all([
      this.courseRepository.listCourseTreesByIds(courseIds),
      this.courseRepository.listCourseOverviewsByIds(courseIds),
      this.financeRepository.listActiveEntitlements({
        learnerUserId: viewer.user.id,
        courseIds,
      }),
    ]);

    const treeByCourseId = new Map(courseTrees.map((course) => [course.id, course]));
    const overviewByCourseId = new Map(courseOverviews.map((course) => [course.id, course]));
    const entitlementByCourseId = new Map(entitlements.map((entitlement) => [entitlement.courseId, entitlement]));

    return entries
      .map((entry) =>
        this.toBookmarkedNodeView(
          viewer,
          entry,
          treeByCourseId.get(entry.courseId) ?? null,
          overviewByCourseId.get(entry.courseId) ?? null,
          entitlementByCourseId.get(entry.courseId) ?? null
        )
      )
      .filter((value): value is BookmarkedNodeView => Boolean(value));
  }

  private toBookmarkedNodeView(
    viewer: Viewer,
    entry: Awaited<ReturnType<NodeBookmarkRepository['listBookmarksByLearner']>>[number],
    courseTree: CourseTreeDetail | null,
    courseOverview: CourseOverview | null,
    entitlement: Awaited<ReturnType<FinanceRepository['getActiveEntitlement']>>
  ): BookmarkedNodeView | null {
    if (!courseTree || !courseOverview) {
      return null;
    }

    const module = courseTree.modules.find((candidate) => candidate.id === entry.moduleId);
    const node = module?.nodes.find((candidate) => candidate.id === entry.nodeId);
    if (!module || !node) {
      return null;
    }

    return {
      savedAt: entry.createdAt,
      courseId: courseTree.id,
      courseTitle: courseTree.title,
      courseImageUrl: courseTree.imageUrl,
      moduleId: module.id,
      moduleTitle: module.title,
      modulePosition: module.position,
      nodeId: node.id,
      nodeTitle: node.title,
      nodeType: node.type,
      nodeExcerpt: node.excerpt,
      isPremium: node.isPremium,
      isLocked: nodeIsLocked(viewer, courseOverview, node, entitlement),
    };
  }
}


