import { ApplicationError, requireValue } from '@/src/application/errors';
import { nodeIsLocked, resolveCourseAccess } from '@/src/domain/courseAccess';
import { viewerCanTrackProgress } from '@/src/domain/learnerProgress';
import type {
  CourseRepository,
  FinanceRepository,
} from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export async function requirePublishedNodeAccess(
  viewer: Viewer,
  input: { courseId: string; nodeId: string },
  dependencies: {
    courseRepository: CourseRepository;
    financeRepository: FinanceRepository;
  }
) {
  const course = requireValue(
    await dependencies.courseRepository.getCourseTreeById(input.courseId),
    'Course not found.'
  );

  if (course.status !== 'published') {
    throw new ApplicationError('Only published courses can track learner node state.', 403);
  }

  const entitlement = await dependencies.financeRepository.getActiveEntitlement({
    learnerUserId: viewer.user.id,
    courseId: input.courseId,
  });
  const access = resolveCourseAccess(viewer, course, entitlement);

  for (const module of course.modules) {
    const node = module.nodes.find((entry) => entry.id === input.nodeId);
    if (!node) {
      continue;
    }

    if (nodeIsLocked(viewer, course, node, access.activeEntitlement)) {
      throw new ApplicationError('This node is locked and cannot be saved yet.', 403);
    }

    return {
      course,
      module,
      node,
      access,
    };
  }

  throw new ApplicationError('Node not found.', 404);
}

export async function requireAccessiblePublishedNode(
  viewer: Viewer,
  input: { courseId: string; nodeId: string },
  dependencies: {
    courseRepository: CourseRepository;
    financeRepository: FinanceRepository;
  }
) {
  if (!viewerCanTrackProgress(viewer)) {
    throw new ApplicationError('This learner node state is unavailable for this account.', 403);
  }

  return requirePublishedNodeAccess(viewer, input, dependencies);
}


