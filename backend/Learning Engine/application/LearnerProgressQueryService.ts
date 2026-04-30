import { deriveCourseProgressSummary } from '@/src/domain/learnerProgress';
import type { LearnerProgressRepository } from '@/src/domain/ports';
import type {
  CourseAccessState,
  CourseContinueLearningTarget,
  CourseOverview,
  CourseProgressSummary,
  CourseTreeDetail,
  CourseTreeModule,
  Viewer,
} from '@/src/domain/models';

function percentage(completed: number, total: number) {
  if (total <= 0) {
    return 0;
  }

  return Math.round((completed / total) * 100);
}

export class LearnerProgressQueryService {
  constructor(private readonly learnerProgressRepository: LearnerProgressRepository) {}

  async getCourseProgressMap(
    viewer: Viewer | null,
    courses: Array<{
      id: string;
      modules: CourseTreeModule[] | CourseTreeDetail['modules'];
    }>
  ) {
    if (!viewer || viewer.profile.isAdmin || courses.length === 0) {
      return new Map<string, CourseProgressSummary>();
    }

    const courseIds = courses.map((course) => course.id);
    const [progressRows, lastVisitedRows] = await Promise.all([
      this.learnerProgressRepository.listNodeProgressByCourses({
        learnerUserId: viewer.user.id,
        courseIds,
      }),
      this.learnerProgressRepository.listLastVisitedNodes({
        learnerUserId: viewer.user.id,
        courseIds,
      }),
    ]);

    const progressRowsByCourseId = new Map<string, typeof progressRows>();
    const lastVisitedByCourseId = new Map(lastVisitedRows.map((row) => [row.courseId, row]));

    for (const progressRow of progressRows) {
      const current = progressRowsByCourseId.get(progressRow.courseId) ?? [];
      current.push(progressRow);
      progressRowsByCourseId.set(progressRow.courseId, current);
    }

    return new Map(
      courses.map((course) => [
        course.id,
        deriveCourseProgressSummary({
          courseId: course.id,
          modules: course.modules as CourseTreeModule[],
          progressRows: progressRowsByCourseId.get(course.id) ?? [],
          lastVisited: lastVisitedByCourseId.get(course.id) ?? null,
        }),
      ])
    );
  }

  async getCatalogProgressMap(
    viewer: Viewer | null,
    courses: Array<
      Pick<CourseOverview, 'id' | 'moduleCount' | 'nodeCount' | 'premiumNodeCount'> & {
        access: Pick<CourseAccessState, 'viewerCanAccessPremium'>;
      }
    >
  ) {
    if (!viewer || viewer.profile.isAdmin || courses.length === 0) {
      return new Map<string, CourseProgressSummary>();
    }

    const courseIds = courses.map((course) => course.id);
    const [progressRows, lastVisitedRows] = await Promise.all([
      this.learnerProgressRepository.listNodeProgressByCourses({
        learnerUserId: viewer.user.id,
        courseIds,
      }),
      this.learnerProgressRepository.listLastVisitedNodes({
        learnerUserId: viewer.user.id,
        courseIds,
      }),
    ]);

    const progressRowsByCourseId = new Map<string, typeof progressRows>();
    const lastVisitedByCourseId = new Map(lastVisitedRows.map((row) => [row.courseId, row]));

    for (const progressRow of progressRows) {
      const current = progressRowsByCourseId.get(progressRow.courseId) ?? [];
      current.push(progressRow);
      progressRowsByCourseId.set(progressRow.courseId, current);
    }

    return new Map(
      courses.map((course) => {
        const courseProgressRows = progressRowsByCourseId.get(course.id) ?? [];
        const completedNodeIds = Array.from(new Set(courseProgressRows.map((row) => row.nodeId)));
        const accessibleNodeCount = course.access.viewerCanAccessPremium
          ? course.nodeCount
          : Math.max(0, course.nodeCount - course.premiumNodeCount);
        const completedNodeCount = Math.min(completedNodeIds.length, accessibleNodeCount);
        const targetRow = lastVisitedByCourseId.get(course.id) ?? courseProgressRows[0] ?? null;
        const continueTarget = targetRow
          ? ({
              courseId: course.id,
              moduleId: targetRow.moduleId,
              moduleTitle: 'Course workspace',
              nodeId: targetRow.nodeId,
              nodeTitle: 'Resume where you left off',
              nodeType: 'content',
              visitedAt: 'visitedAt' in targetRow ? targetRow.visitedAt : targetRow.updatedAt,
            } satisfies CourseContinueLearningTarget & { visitedAt?: string })
          : null;

        return [
          course.id,
          {
            courseId: course.id,
            accessibleNodeCount,
            completedNodeCount,
            completionPercent: percentage(completedNodeCount, accessibleNodeCount),
            totalModuleCount: course.moduleCount,
            completedModuleCount:
              accessibleNodeCount > 0 && completedNodeCount >= accessibleNodeCount ? course.moduleCount : 0,
            completedNodeIds,
            moduleProgress: [],
            lastVisited: continueTarget,
            continueLearning: continueTarget,
          } satisfies CourseProgressSummary,
        ];
      })
    );
  }
}
