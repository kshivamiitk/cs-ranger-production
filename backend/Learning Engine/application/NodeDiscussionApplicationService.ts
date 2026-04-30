import { randomUUID } from 'node:crypto';

import { ApplicationError, requireValue } from '@/src/application/errors';
import { canAccessNodeContent } from '@/src/domain/courseAccess';
import type { FinanceRepository, NodeDiscussionRepository } from '@/src/domain/ports';
import type {
  NodeDiscussionCommentTag,
  NodeDiscussionCommentView,
  NodeDiscussionPreview,
  NodeDiscussionView,
  Viewer,
} from '@/src/domain/models';

export class NodeDiscussionApplicationService {
  constructor(
    private readonly nodeDiscussionRepository: NodeDiscussionRepository,
    private readonly financeRepository: FinanceRepository
  ) {}

  async getNodeDiscussionView(viewer: Viewer | null, nodeId: string): Promise<NodeDiscussionView> {
    const preview = requireValue(
      await this.nodeDiscussionRepository.listNodeDiscussionPreview(nodeId),
      'Node discussion not found.',
      404
    );

    await this.assertViewerCanViewNode(viewer, preview);
    const canParticipate = viewer
      ? await this.nodeDiscussionRepository.canUserCommentOnNode({
          nodeId,
          userId: viewer.user.id,
        })
      : false;

    const comments = await this.nodeDiscussionRepository.listCommentsByNodeId({
      nodeId,
      viewerUserId: viewer?.user.id ?? null,
    });

    return {
      preview,
      comments: comments.map((comment) => this.applyCommentPermissions(comment, preview, viewer, canParticipate)),
      canParticipate,
    };
  }

  async createComment(
    viewer: Viewer,
    nodeId: string,
    input: { body: string; parentCommentId: string | null; commentTag?: NodeDiscussionCommentTag | null }
  ) {
    const body = input.body.trim();
    if (!body) {
      throw new ApplicationError('Comment cannot be empty.');
    }

    const preview = requireValue(
      await this.nodeDiscussionRepository.listNodeDiscussionPreview(nodeId),
      'Node discussion not found.',
      404
    );

    await this.assertViewerCanViewNode(viewer, preview);
    await this.assertViewerCanComment(viewer, nodeId);

    let rootCommentId = '';
    let depth = 0;
    let commentTag: NodeDiscussionCommentTag = input.commentTag === 'doubt' ? 'doubt' : 'discussion';

    if (input.parentCommentId) {
      const parent = requireValue(
        await this.nodeDiscussionRepository.getCommentById(input.parentCommentId),
        'Parent comment not found.',
        404
      );

      if (parent.nodeId !== nodeId) {
        throw new ApplicationError('Parent comment does not belong to this node.', 400);
      }

      if (parent.isDeleted) {
        throw new ApplicationError('Cannot reply to a deleted comment.', 400);
      }

      depth = parent.depth + 1;
      if (depth > 6) {
        throw new ApplicationError('Reply nesting is too deep.');
      }

      rootCommentId = parent.rootCommentId;
      commentTag = 'discussion';
    }

    const id = randomUUID();
    const created = await this.nodeDiscussionRepository.createComment({
      id,
      threadId: preview.thread.id,
      courseId: preview.courseId,
      nodeId,
      authorUserId: viewer.user.id,
      parentCommentId: input.parentCommentId,
      rootCommentId: rootCommentId || id,
      commentTag,
      depth,
      body,
    });

    return created;
  }

  async updateComment(viewer: Viewer, commentId: string, input: { body: string }) {
    const body = input.body.trim();
    if (!body) {
      throw new ApplicationError('Comment cannot be empty.');
    }

    const current = requireValue(
      await this.nodeDiscussionRepository.getCommentById(commentId),
      'Comment not found.',
      404
    );

    if (current.authorUserId !== viewer.user.id) {
      throw new ApplicationError('You can edit only your own comments.', 403);
    }

    if (current.isDeleted) {
      throw new ApplicationError('Deleted comments cannot be edited.', 400);
    }

    return this.nodeDiscussionRepository.updateComment({
      commentId,
      actorUserId: viewer.user.id,
      body,
    });
  }

  async softDeleteComment(viewer: Viewer, commentId: string) {
    const current = requireValue(
      await this.nodeDiscussionRepository.getCommentById(commentId),
      'Comment not found.',
      404
    );

    if (current.authorUserId !== viewer.user.id) {
      throw new ApplicationError('You can delete only your own comments.', 403);
    }

    return this.nodeDiscussionRepository.softDeleteComment(commentId, viewer.user.id);
  }

  async toggleLike(viewer: Viewer, commentId: string) {
    const current = requireValue(
      await this.nodeDiscussionRepository.getCommentById(commentId),
      'Comment not found.',
      404
    );
    const preview = requireValue(
      await this.nodeDiscussionRepository.listNodeDiscussionPreview(current.nodeId),
      'Node discussion not found.',
      404
    );

    await this.assertViewerCanViewNode(viewer, preview);
    return this.nodeDiscussionRepository.toggleLike(commentId, viewer.user.id);
  }

  async markRootCommentResolved(viewer: Viewer, commentId: string) {
    const context = await this.getResolvableCommentContext(commentId);
    this.assertCreatorOwnsDoubt(viewer, context.preview, context.comment);
    return this.nodeDiscussionRepository.markRootCommentResolved(commentId, viewer.user.id);
  }

  async reopenRootComment(viewer: Viewer, commentId: string) {
    const context = await this.getResolvableCommentContext(commentId);
    this.assertCreatorOwnsDoubt(viewer, context.preview, context.comment);
    return this.nodeDiscussionRepository.reopenRootComment(commentId, viewer.user.id);
  }

  private async getResolvableCommentContext(commentId: string) {
    const comment = requireValue(
      await this.nodeDiscussionRepository.getCommentById(commentId),
      'Comment not found.',
      404
    );
    const preview = requireValue(
      await this.nodeDiscussionRepository.listNodeDiscussionPreview(comment.nodeId),
      'Node discussion not found.',
      404
    );

    if (comment.parentCommentId) {
      throw new ApplicationError('Only top-level comments can be resolved.', 400);
    }

    if (comment.commentTag !== 'doubt') {
      throw new ApplicationError('Only comments tagged as doubt can be resolved.', 400);
    }

    return {
      preview,
      comment,
    };
  }

  private assertCreatorOwnsDoubt(
    viewer: Viewer,
    preview: NodeDiscussionPreview,
    comment: { status: 'open' | 'resolved' | string }
  ) {
    if (viewer.user.id !== preview.courseCreatorUserId) {
      throw new ApplicationError('Only the course creator can resolve doubts.', 403);
    }

    if (comment.status !== 'open' && comment.status !== 'resolved') {
      throw new ApplicationError('Unsupported discussion status.', 400);
    }
  }

  private async assertViewerCanViewNode(viewer: Viewer | null, preview: NodeDiscussionPreview) {
    const allowed = await this.viewerCanAccessNode(viewer, preview);
    if (!allowed) {
      throw new ApplicationError('You cannot access this node discussion.', 403);
    }
  }

  private async assertViewerCanComment(viewer: Viewer, nodeId: string) {
    const canComment = await this.nodeDiscussionRepository.canUserCommentOnNode({
      nodeId,
      userId: viewer.user.id,
    });

    if (!canComment) {
      throw new ApplicationError('You cannot comment on this node.', 403);
    }
  }

  private async viewerCanAccessNode(viewer: Viewer | null, preview: NodeDiscussionPreview) {
    if (viewer?.profile.isBanned) {
      return false;
    }

    if (viewer && (viewer.profile.isAdmin || viewer.user.id === preview.courseCreatorUserId)) {
      return true;
    }

    if (preview.courseStatus !== 'published') {
      return false;
    }

    if (!preview.nodeIsPremium) {
      return true;
    }

    if (!viewer) {
      return false;
    }

    const activeEntitlement = await this.financeRepository.getActiveEntitlement({
      learnerUserId: viewer.user.id,
      courseId: preview.courseId,
    });

    return canAccessNodeContent(
      viewer,
      {
        creatorUserId: preview.courseCreatorUserId,
        premiumEnabled: preview.premiumEnabled,
        priceAmount: preview.priceAmount,
        premiumAccessDays: preview.premiumAccessDays,
      },
      {
        isPremium: preview.nodeIsPremium,
      },
      activeEntitlement
    );
  }

  private applyCommentPermissions(
    comment: NodeDiscussionCommentView,
    preview: NodeDiscussionPreview,
    viewer: Viewer | null,
    canParticipate: boolean
  ): NodeDiscussionCommentView {
    const isAuthor = Boolean(viewer && viewer.user.id === comment.authorUserId);
    const creatorOwnsCourse = Boolean(viewer && viewer.user.id === preview.courseCreatorUserId);
    const rootDoubtComment = comment.parentCommentId === null && comment.commentTag === 'doubt';

    return {
      ...comment,
      canEdit: isAuthor && !comment.isDeleted,
      canDelete: isAuthor && !comment.isDeleted,
      canReply: canParticipate,
      canResolve:
        creatorOwnsCourse &&
        rootDoubtComment &&
        !comment.isDeleted &&
        comment.status === 'open',
      canReopen:
        creatorOwnsCourse &&
        rootDoubtComment &&
        !comment.isDeleted &&
        comment.status === 'resolved',
    };
  }
}


