import type {
  CourseContinueLearningTarget,
  CourseProgressSummary,
  CourseTreeModule,
  LearnerLastVisitedNode,
  LearnerNodeProgress,
  Viewer,
} from '@/src/domain/models';

function percentage(completed: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

function toContinueLearningTarget(
  module: Pick<CourseTreeModule, 'id' | 'title'>,
  node: Pick<CourseTreeModule['nodes'][number], 'id' | 'title' | 'type'>,
  courseId: string
): CourseContinueLearningTarget {
  return {
    courseId,
    moduleId: module.id,
    moduleTitle: module.title,
    nodeId: node.id,
    nodeTitle: node.title,
    nodeType: node.type,
  };
}

export function deriveCourseProgressSummary(input: {
  courseId: string;
  modules: CourseTreeModule[];
  progressRows: LearnerNodeProgress[];
  lastVisited: LearnerLastVisitedNode | null;
}): CourseProgressSummary {
  const completedNodeIdSet = new Set(input.progressRows.map((row) => row.nodeId));
  const accessibleEntries = input.modules.flatMap((module) =>
    module.nodes
      .filter((node) => !node.isLocked)
      .map((node) => ({ module, node }))
  );

  const moduleProgress = input.modules.map((module) => {
    const accessibleNodes = module.nodes.filter((node) => !node.isLocked);
    const completedNodeCount = accessibleNodes.filter((node) => completedNodeIdSet.has(node.id)).length;
    return {
      moduleId: module.id,
      accessibleNodeCount: accessibleNodes.length,
      completedNodeCount,
      completionPercent: percentage(completedNodeCount, accessibleNodes.length),
    };
  });

  const completedNodeIds = accessibleEntries
    .filter((entry) => completedNodeIdSet.has(entry.node.id))
    .map((entry) => entry.node.id);
  const accessibleNodeCount = accessibleEntries.length;
  const completedNodeCount = completedNodeIds.length;
  const completedModuleCount = moduleProgress.filter(
    (module) => module.accessibleNodeCount > 0 && module.completedNodeCount === module.accessibleNodeCount
  ).length;
  const lastVisitedEntry =
    input.lastVisited
      ? accessibleEntries.find((entry) => entry.node.id === input.lastVisited?.nodeId) ?? null
      : null;
  const firstIncompleteEntry =
    accessibleEntries.find((entry) => !completedNodeIdSet.has(entry.node.id)) ?? null;
  const continueEntry = firstIncompleteEntry ?? lastVisitedEntry ?? accessibleEntries.at(-1) ?? null;

  return {
    courseId: input.courseId,
    accessibleNodeCount,
    completedNodeCount,
    completionPercent: percentage(completedNodeCount, accessibleNodeCount),
    totalModuleCount: input.modules.length,
    completedModuleCount,
    completedNodeIds,
    moduleProgress,
    lastVisited: lastVisitedEntry
      ? toContinueLearningTarget(lastVisitedEntry.module, lastVisitedEntry.node, input.courseId)
      : null,
    continueLearning: continueEntry
      ? toContinueLearningTarget(continueEntry.module, continueEntry.node, input.courseId)
      : null,
  };
}

export function viewerCanTrackProgress(viewer: Viewer | null) {
  return Boolean(viewer && !viewer.profile.isBanned && !viewer.profile.isAdmin);
}

export function viewerCanUseNodeBookmarks(viewer: Viewer | null) {
  return Boolean(viewer && !viewer.profile.isBanned);
}

export function viewerCanUseWishlist(viewer: Viewer | null) {
  return Boolean(viewer && !viewer.profile.isAdmin && !viewer.profile.isBanned && viewer.profile.primaryRole === 'learner');
}


