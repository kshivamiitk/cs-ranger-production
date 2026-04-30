import { ApplicationError, requireValue } from '@/src/application/errors';
import { NodeDiscussionQueryService } from '@/src/application/NodeDiscussionQueryService';
import type { NodeDiscussionRepository } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class CreatorLearnerDoubtQueryService {
  constructor(
    private readonly nodeDiscussionRepository: NodeDiscussionRepository,
    private readonly nodeDiscussionQueryService: NodeDiscussionQueryService
  ) {}

  async listCreatorLearnerDoubts(viewer: Viewer) {
    this.assertCreator(viewer);
    const doubts = await this.nodeDiscussionRepository.listCreatorLearnerDoubts(viewer.user.id);
    return doubts.filter(
      (item) =>
        item.courseCreatorUserId === viewer.user.id &&
        item.parentCommentId === null &&
        item.status === 'open' &&
        !item.isDeleted
    );
  }

  async getCreatorLearnerDoubtDetail(viewer: Viewer, commentId: string) {
    this.assertCreator(viewer);

    const doubts = await this.nodeDiscussionRepository.listCreatorLearnerDoubts(viewer.user.id);
    const doubt = requireValue(
      doubts.find((entry) => entry.commentId === commentId),
      'Doubt not found.',
      404
    );

    const discussion = await this.nodeDiscussionQueryService.getNodeDiscussionView(viewer, doubt.nodeId);
    return {
      doubt,
      discussion,
    };
  }

  private assertCreator(viewer: Viewer) {
    if (viewer.profile.primaryRole !== 'creator') {
      throw new ApplicationError('Creator access is required.', 403);
    }
  }
}


