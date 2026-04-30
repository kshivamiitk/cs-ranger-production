import { ApplicationError } from '@/src/application/errors';
import { requireAccessiblePublishedNode } from '@/src/application/learnerNodeAccess';
import type {
  CourseRepository,
  FinanceRepository,
  LearnerProgressRepository,
} from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class LearnerProgressApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly financeRepository: FinanceRepository,
    private readonly learnerProgressRepository: LearnerProgressRepository
  ) {}

  async markNodeComplete(viewer: Viewer, input: { courseId: string; nodeId: string }) {
    const target = await this.requireAccessibleNode(viewer, input);
    return this.learnerProgressRepository.upsertNodeCompletion({
      learnerUserId: viewer.user.id,
      courseId: input.courseId,
      moduleId: target.module.id,
      nodeId: target.node.id,
    });
  }

  async markNodeIncomplete(viewer: Viewer, input: { courseId: string; nodeId: string }) {
    await this.requireAccessibleNode(viewer, input);
    await this.learnerProgressRepository.deleteNodeCompletion({
      learnerUserId: viewer.user.id,
      nodeId: input.nodeId,
    });
  }

  async setLastVisitedNode(viewer: Viewer, input: { courseId: string; nodeId: string }) {
    const target = await this.requireAccessibleNode(viewer, input);
    return this.learnerProgressRepository.upsertLastVisitedNode({
      learnerUserId: viewer.user.id,
      courseId: input.courseId,
      moduleId: target.module.id,
      nodeId: target.node.id,
    });
  }

  private async requireAccessibleNode(viewer: Viewer, input: { courseId: string; nodeId: string }) {
    try {
      return await requireAccessiblePublishedNode(viewer, input, {
        courseRepository: this.courseRepository,
        financeRepository: this.financeRepository,
      });
    } catch (error) {
      if (error instanceof ApplicationError) {
        if (error.message === 'This learner node state is unavailable for this account.') {
          throw new ApplicationError('Learner progress is unavailable for this account.', 403);
        }

        if (error.message === 'Only published courses can track learner node state.') {
          throw new ApplicationError('Only published courses can track learner progress.', 403);
        }

        if (error.message === 'This node is locked and cannot be saved yet.') {
          throw new ApplicationError('This node is locked and cannot be tracked yet.', 403);
        }
      }

      throw error;
    }
  }
}


