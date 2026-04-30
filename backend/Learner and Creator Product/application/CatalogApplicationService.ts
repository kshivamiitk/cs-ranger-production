import { unstable_cache } from 'next/cache';

import { ApplicationError, requireValue } from '@/src/application/errors';
import { nodeIsLocked, resolveCourseAccess } from '@/src/domain/courseAccess';
import { CatalogCourseSummaryQueryService } from '@/src/application/CatalogCourseSummaryQueryService';
import { LearnerProgressQueryService } from '@/src/application/LearnerProgressQueryService';
import type { CourseRepository, FinanceRepository } from '@/src/domain/ports';
import type {
  CatalogCourseQuery,
  CatalogCourseNodeView,
  CatalogCourseSummary,
  CatalogCourseTreeView,
  CatalogCourseWorkspaceView,
  CourseNode,
  CourseNodeLink,
  CourseOverview,
  CourseTreeDetail,
  CourseTreeModule,
  CourseTreeNode,
  Viewer,
} from '@/src/domain/models';

export class CatalogApplicationService {
  private readonly listPublishedCourseOverviews: (input?: CatalogCourseQuery) => Promise<CourseOverview[]>;
  private readonly getCourseTreeByIdCached: (courseId: string) => Promise<CourseTreeDetail | null>;
  private readonly getReadableNodeByIdCached: (nodeId: string) => Promise<CourseNode | null>;

  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly catalogCourseSummaryQueryService: CatalogCourseSummaryQueryService,
    private readonly learnerProgressQueryService: LearnerProgressQueryService
  ) {
    this.listPublishedCourseOverviews = unstable_cache(
      async (input?: CatalogCourseQuery) => this.courseRepository.listPublishedCourses(input),
      ['catalog-published-course-overviews'],
      {
        revalidate: 30,
        tags: ['catalog-published-course-overviews'],
      }
    );
    this.getCourseTreeByIdCached = unstable_cache(
      async (courseId: string) => this.courseRepository.getCourseTreeById(courseId),
      ['catalog-course-tree'],
      {
        revalidate: 30,
        tags: ['catalog-course-tree'],
      }
    );
    this.getReadableNodeByIdCached = unstable_cache(
      async (nodeId: string) => this.courseRepository.getReadableNodeById(nodeId),
      ['catalog-readable-node'],
      {
        revalidate: 30,
        tags: ['catalog-readable-node'],
      }
    );
  }

  async listPublishedCourses(
    viewer: Viewer | null,
    input?: CatalogCourseQuery
  ): Promise<CatalogCourseSummary[]> {
    const courses = await this.listPublishedCourseOverviews(input);
    return this.catalogCourseSummaryQueryService.buildSummaries(viewer, courses);
  }

  async getCourseTreeView(viewer: Viewer | null, courseId: string): Promise<CatalogCourseTreeView> {
    const course = requireValue(await this.getCourseTreeByIdCached(courseId), 'Course not found.');

    if (course.status !== 'published') {
      throw new ApplicationError('This course is not published.', 404);
    }

    const access = resolveCourseAccess(
      viewer,
      course,
      viewer ? await this.financeRepository.getActiveEntitlement({ learnerUserId: viewer.user.id, courseId }) : null
    );
    const overview = buildCourseOverview(course);

    const baseModules = course.modules.map((module) => ({
      ...module,
      nodes: module.nodes.map((node) => ({
        ...node,
        isLocked: nodeIsLocked(viewer, course, node, access.activeEntitlement),
        isCompleted: false,
      })),
      accessibleNodeCount: 0,
      completedNodeCount: 0,
      completionPercent: 0,
    })) satisfies CourseTreeModule[];
    const progress = await this.loadCourseProgress(viewer, course.id, baseModules);
    const modules = mergeProgressIntoCourseModules(baseModules, progress);

    return {
      course: {
        ...course,
        modules,
      },
      overview,
      access,
    };
  }

  async getCourseWorkspaceView(
    viewer: Viewer | null,
    courseId: string,
    requestedNodeId?: string | null
  ): Promise<CatalogCourseWorkspaceView> {
    const course = requireValue(await this.getCourseTreeByIdCached(courseId), 'Course not found.');

    if (course.status !== 'published') {
      throw new ApplicationError('This course is not published.', 404);
    }

    const activeEntitlement = viewer
      ? await this.financeRepository.getActiveEntitlement({ learnerUserId: viewer.user.id, courseId })
      : null;
    const access = resolveCourseAccess(viewer, course, activeEntitlement);
    const overview = buildCourseOverview(course);
    const treeModules = course.modules.map((module) => ({
      ...module,
      nodes: module.nodes.map((node) => ({
        ...node,
        isLocked: nodeIsLocked(viewer, course, node, activeEntitlement),
        isCompleted: false,
      })),
      accessibleNodeCount: 0,
      completedNodeCount: 0,
      completionPercent: 0,
    }));
    const progress = await this.loadCourseProgress(viewer, course.id, treeModules);
    const progressedModules = mergeProgressIntoCourseModules(treeModules, progress);

    const orderedEntries = flattenCourseNodes(progressedModules);
    const activeEntry =
      orderedEntries.find((entry) => entry.node.id === requestedNodeId) ??
      orderedEntries.find((entry) => entry.node.id === progress?.continueLearning?.nodeId) ??
      orderedEntries.find((entry) => !entry.node.isLocked) ??
      orderedEntries[0] ??
      null;
    const activeIndex = activeEntry
      ? orderedEntries.findIndex((entry) => entry.node.id === activeEntry.node.id)
      : -1;
    const activeNode = activeEntry && !activeEntry.node.isLocked
      ? await this.getReadableNodeByIdCached(activeEntry.node.id)
      : null;

    return {
      course: {
        ...course,
        modules: progressedModules,
      },
      overview,
      access,
      progress,
      activeModule: activeEntry
        ? {
            id: activeEntry.module.id,
            title: activeEntry.module.title,
            summary: activeEntry.module.summary,
            position: activeEntry.module.position,
          }
        : null,
      activeNodeSummary: activeEntry?.node ?? null,
      activeNode,
      previousNode: activeIndex >= 0 ? toCourseNodeLink(orderedEntries[activeIndex - 1] ?? null) : null,
      nextNode: activeIndex >= 0 ? toCourseNodeLink(orderedEntries[activeIndex + 1] ?? null) : null,
    };
  }

  async getCourseNodeView(viewer: Viewer | null, courseId: string, nodeId: string): Promise<CatalogCourseNodeView> {
    const course = requireValue(await this.getCourseTreeByIdCached(courseId), 'Course not found.');

    if (course.status !== 'published') {
      throw new ApplicationError('This course is not published.', 404);
    }

    const activeEntitlement = viewer
      ? await this.financeRepository.getActiveEntitlement({ learnerUserId: viewer.user.id, courseId })
      : null;
    const access = resolveCourseAccess(viewer, course, activeEntitlement);
    const overview = buildCourseOverview(course);
    const treeModules = course.modules.map((module) => ({
      ...module,
      nodes: module.nodes.map((node) => ({
        ...node,
        isLocked: nodeIsLocked(viewer, course, node, activeEntitlement),
        isCompleted: false,
      })),
      accessibleNodeCount: 0,
      completedNodeCount: 0,
      completionPercent: 0,
    }));
    const progress = await this.loadCourseProgress(viewer, course.id, treeModules);
    const progressedModules = mergeProgressIntoCourseModules(treeModules, progress);
    const orderedNodeEntries = flattenCourseNodes(progressedModules);
    const activeIndex = orderedNodeEntries.findIndex((entry) => entry.node.id === nodeId);

    if (activeIndex < 0) {
      throw new ApplicationError('Node not found.', 404);
    }

    const activeEntry = orderedNodeEntries[activeIndex];
    const fullNode = activeEntry.node.isLocked ? null : await this.getReadableNodeByIdCached(nodeId);

    return {
      course: {
        id: course.id,
        title: course.title,
        description: course.description,
        imageUrl: course.imageUrl,
        priceAmount: course.priceAmount,
        premiumEnabled: course.premiumEnabled,
        premiumAccessDays: course.premiumAccessDays,
      },
      overview,
      access,
      progress,
      module: {
        id: activeEntry.module.id,
        title: activeEntry.module.title,
        summary: activeEntry.module.summary,
        position: activeEntry.module.position,
      },
      nodeSummary: activeEntry.node,
      node: fullNode,
      nodeLocked: activeEntry.node.isLocked,
      nodeCompleted: activeEntry.node.isCompleted,
      previousNode: toCourseNodeLink(orderedNodeEntries[activeIndex - 1] ?? null),
      nextNode: toCourseNodeLink(orderedNodeEntries[activeIndex + 1] ?? null),
    };
  }

  private async loadEntitlementMap(viewer: Viewer | null, courseIds: string[]) {
    if (!viewer || courseIds.length === 0) {
      return new Map<string, CatalogCourseSummary['access']['activeEntitlement']>();
    }

    const entitlements = await this.financeRepository.listActiveEntitlements({
      learnerUserId: viewer.user.id,
      courseIds,
    });

    return new Map(entitlements.map((entitlement) => [entitlement.courseId, entitlement]));
  }

  private async loadCourseProgress(
    viewer: Viewer | null,
    courseId: string,
    modules: CourseTreeModule[]
  ) {
    const progressMap = await this.learnerProgressQueryService.getCourseProgressMap(viewer, [
      {
        id: courseId,
        modules,
      },
    ]);

    return progressMap.get(courseId) ?? null;
  }
}

function flattenCourseNodes(modules: CourseTreeModule[]) {
  return [...modules]
    .sort((left, right) => left.position - right.position)
    .flatMap((module) =>
      [...module.nodes]
        .sort((left, right) => left.position - right.position)
        .map((node) => ({ module, node }))
    );
}

function mergeProgressIntoCourseModules(
  modules: CourseTreeModule[],
  progress: CatalogCourseWorkspaceView['progress']
) {
  const completedNodeIdSet = new Set(progress?.completedNodeIds ?? []);
  const moduleProgressById = new Map(
    (progress?.moduleProgress ?? []).map((entry) => [entry.moduleId, entry])
  );

  return modules.map((module) => {
    const moduleProgress = moduleProgressById.get(module.id);
    return {
      ...module,
      nodes: module.nodes.map((node) => ({
        ...node,
        isCompleted: completedNodeIdSet.has(node.id),
      })),
      accessibleNodeCount: moduleProgress?.accessibleNodeCount ?? 0,
      completedNodeCount: moduleProgress?.completedNodeCount ?? 0,
      completionPercent: moduleProgress?.completionPercent ?? 0,
    };
  });
}

function toCourseNodeLink(
  entry: ReturnType<typeof flattenCourseNodes>[number] | null
): CourseNodeLink | null {
  if (!entry) {
    return null;
  }

  return {
    id: entry.node.id,
    title: entry.node.title,
    type: entry.node.type,
    position: entry.node.position,
    moduleId: entry.module.id,
    moduleTitle: entry.module.title,
    modulePosition: entry.module.position,
    isPremium: entry.node.isPremium,
    isLocked: entry.node.isLocked,
  };
}

function buildCourseOverview(course: CourseTreeDetail): CourseOverview {
  return {
    id: course.id,
    creatorUserId: course.creatorUserId,
    title: course.title,
    slug: course.slug,
    description: course.description,
    imageUrl: course.imageUrl,
    priceAmount: course.priceAmount,
    premiumEnabled: course.premiumEnabled,
    premiumAccessDays: course.premiumAccessDays,
    premiumUpdatedAt: course.premiumUpdatedAt,
    status: course.status,
    createdAt: course.createdAt,
    updatedAt: course.updatedAt,
    moduleCount: course.modules.length,
    nodeCount: course.modules.reduce((sum, module) => sum + module.nodes.length, 0),
    premiumNodeCount: course.modules.reduce(
      (sum, module) => sum + module.nodes.filter((node) => node.isPremium).length,
      0
    ),
    engagement: {
      wishlistCount: 0,
      averageRating: 0,
      totalReviews: 0,
      activeLearnerCount: 0,
    },
  };
}
