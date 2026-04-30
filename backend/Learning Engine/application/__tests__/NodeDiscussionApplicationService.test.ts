import assert from 'node:assert/strict';
import test from 'node:test';

import { NodeDiscussionApplicationService } from '@/src/application/NodeDiscussionApplicationService';
import type {
  FinanceRepository,
  NodeDiscussionRepository,
} from '@/src/domain/ports';
import type {
  NodeDiscussionComment,
  NodeDiscussionCommentView,
  NodeDiscussionPreview,
  Viewer,
} from '@/src/domain/models';

function viewer(input: {
  id: string;
  role: 'learner' | 'creator';
  isAdmin?: boolean;
}): Viewer {
  return {
    user: {
      id: input.id,
      email: `${input.id}@example.com`,
      fullName: input.id,
    },
    profile: {
      userId: input.id,
      fullName: input.id,
      primaryRole: input.role,
      themeMode: 'dark',
      profilePhotoUrl: null,
      bio: null,
      isAdmin: Boolean(input.isAdmin),
      isBanned: false,
    },
  };
}

function buildPreview(overrides?: Partial<NodeDiscussionPreview>): NodeDiscussionPreview {
  return {
    nodeId: 'node-1',
    nodeTitle: 'Question node',
    nodeType: 'question',
    nodeIsPremium: false,
    courseId: 'course-1',
    courseTitle: 'Course',
    courseStatus: 'published',
    courseCreatorUserId: 'creator-1',
    premiumEnabled: false,
    priceAmount: 0,
    premiumAccessDays: null,
    thread: {
      id: 'thread-1',
      courseId: 'course-1',
      nodeId: 'node-1',
      creatorUserId: 'creator-1',
      isOpen: true,
      unresolvedCount: 1,
      lastActivityAt: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    },
    ...overrides,
  };
}

function buildComment(input?: Partial<NodeDiscussionComment>): NodeDiscussionComment {
  return {
    id: input?.id ?? 'comment-1',
    threadId: input?.threadId ?? 'thread-1',
    courseId: input?.courseId ?? 'course-1',
    nodeId: input?.nodeId ?? 'node-1',
    authorUserId: input?.authorUserId ?? 'learner-1',
    parentCommentId: input?.parentCommentId ?? null,
    rootCommentId: input?.rootCommentId ?? 'comment-1',
    commentTag: input?.commentTag ?? 'discussion',
    body: input?.body ?? 'Question',
    depth: input?.depth ?? 0,
    replyCount: input?.replyCount ?? 0,
    likeCount: input?.likeCount ?? 0,
    isEdited: input?.isEdited ?? false,
    isDeleted: input?.isDeleted ?? false,
    status: input?.status ?? 'open',
    resolvedByUserId: input?.resolvedByUserId ?? null,
    resolvedAt: input?.resolvedAt ?? null,
    createdAt: input?.createdAt ?? new Date().toISOString(),
    updatedAt: input?.updatedAt ?? new Date().toISOString(),
  };
}

test('learner can create, update, and soft delete own comment', async () => {
  const comments = new Map<string, NodeDiscussionComment>();
  const repo: NodeDiscussionRepository = {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      return buildPreview().thread;
    },
    async listCommentsByNodeId() {
      return [];
    },
    async createComment(input) {
      const created = buildComment({
        id: input.id,
        authorUserId: input.authorUserId,
        body: input.body,
        parentCommentId: input.parentCommentId,
        rootCommentId: input.rootCommentId,
        commentTag: input.commentTag,
        depth: input.depth,
      });
      comments.set(created.id, created);
      return created;
    },
    async updateComment(input) {
      const current = comments.get(input.commentId)!;
      const updated = {
        ...current,
        body: input.body,
        isEdited: true,
      };
      comments.set(updated.id, updated);
      return updated;
    },
    async softDeleteComment(commentId) {
      const current = comments.get(commentId)!;
      const deleted = {
        ...current,
        isDeleted: true,
      };
      comments.set(deleted.id, deleted);
      return deleted;
    },
    async toggleLike() {
      return { liked: true, likeCount: 1 };
    },
    async markRootCommentResolved() {
      throw new Error('Not used');
    },
    async reopenRootComment() {
      throw new Error('Not used');
    },
    async listCreatorLearnerDoubts() {
      return [];
    },
    async listNodeDiscussionPreview() {
      return buildPreview();
    },
    async getCommentById(commentId) {
      return comments.get(commentId) ?? null;
    },
    async canUserCommentOnNode() {
      return true;
    },
  };
  const finance: Pick<FinanceRepository, 'getActiveEntitlement'> = {
    async getActiveEntitlement() {
      return null;
    },
  };

  const service = new NodeDiscussionApplicationService(
    repo,
    finance as FinanceRepository
  );
  const learner = viewer({ id: 'learner-1', role: 'learner' });

  const created = await service.createComment(learner, 'node-1', {
    body: 'First question',
    parentCommentId: null,
  });
  assert.equal(created.authorUserId, 'learner-1');

  const updated = await service.updateComment(learner, created.id, {
    body: 'Updated question',
  });
  assert.equal(updated.body, 'Updated question');

  const deleted = await service.softDeleteComment(learner, created.id);
  assert.equal(deleted.isDeleted, true);
});

test('learner cannot edit another learner comment', async () => {
  const existing = buildComment({
    id: 'comment-2',
    authorUserId: 'learner-1',
  });
  const repo: NodeDiscussionRepository = {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      return buildPreview().thread;
    },
    async listCommentsByNodeId() {
      return [];
    },
    async createComment() {
      return existing;
    },
    async updateComment() {
      return existing;
    },
    async softDeleteComment() {
      return existing;
    },
    async toggleLike() {
      return { liked: true, likeCount: 1 };
    },
    async markRootCommentResolved() {
      return existing;
    },
    async reopenRootComment() {
      return existing;
    },
    async listCreatorLearnerDoubts() {
      return [];
    },
    async listNodeDiscussionPreview() {
      return buildPreview();
    },
    async getCommentById() {
      return existing;
    },
    async canUserCommentOnNode() {
      return true;
    },
  };
  const finance: Pick<FinanceRepository, 'getActiveEntitlement'> = {
    async getActiveEntitlement() {
      return null;
    },
  };
  const service = new NodeDiscussionApplicationService(
    repo,
    finance as FinanceRepository
  );

  await assert.rejects(
    () =>
      service.updateComment(viewer({ id: 'learner-2', role: 'learner' }), 'comment-2', {
        body: 'Should fail',
      }),
    /only your own comments/i
  );
});

test('creator can resolve and reopen eligible root learner doubt on question node', async () => {
  let status: 'open' | 'resolved' = 'open';
  const root = buildComment({
    id: 'root-1',
    authorUserId: 'learner-1',
    commentTag: 'doubt',
    status,
  });

  const repo: NodeDiscussionRepository = {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      return buildPreview().thread;
    },
    async listCommentsByNodeId() {
      return [
        {
          ...root,
          status,
          author: {
            userId: 'learner-1',
            fullName: 'Learner 1',
            primaryRole: 'learner',
            profilePhotoUrl: null,
            bio: null,
            isBanned: false,
          },
          viewerHasLiked: false,
          canEdit: false,
          canDelete: false,
          canReply: true,
          canResolve: true,
          canReopen: false,
        } satisfies NodeDiscussionCommentView,
      ];
    },
    async createComment() {
      return root;
    },
    async updateComment() {
      return root;
    },
    async softDeleteComment() {
      return root;
    },
    async toggleLike() {
      return { liked: true, likeCount: 1 };
    },
    async markRootCommentResolved() {
      status = 'resolved';
      return {
        ...root,
        status,
      };
    },
    async reopenRootComment() {
      status = 'open';
      return {
        ...root,
        status,
      };
    },
    async listCreatorLearnerDoubts() {
      return [];
    },
    async listNodeDiscussionPreview() {
      return buildPreview({
        nodeType: 'question',
        courseCreatorUserId: 'creator-1',
      });
    },
    async getCommentById() {
      return {
        ...root,
        status,
      };
    },
    async canUserCommentOnNode() {
      return true;
    },
  };
  const finance: Pick<FinanceRepository, 'getActiveEntitlement'> = {
    async getActiveEntitlement() {
      return null;
    },
  };
  const service = new NodeDiscussionApplicationService(
    repo,
    finance as FinanceRepository
  );

  const creator = viewer({ id: 'creator-1', role: 'creator' });
  const resolved = await service.markRootCommentResolved(creator, 'root-1');
  assert.equal(resolved.status, 'resolved');
  const reopened = await service.reopenRootComment(creator, 'root-1');
  assert.equal(reopened.status, 'open');
});

test('non-creator cannot resolve learner doubts', async () => {
  const root = buildComment({
    id: 'root-2',
    authorUserId: 'learner-1',
    commentTag: 'doubt',
  });

  const repo: NodeDiscussionRepository = {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      return buildPreview().thread;
    },
    async listCommentsByNodeId() {
      return [
        {
          ...root,
          author: {
            userId: 'learner-1',
            fullName: 'Learner 1',
            primaryRole: 'learner',
            profilePhotoUrl: null,
            bio: null,
            isBanned: false,
          },
          viewerHasLiked: false,
          canEdit: false,
          canDelete: false,
          canReply: true,
          canResolve: true,
          canReopen: false,
        },
      ];
    },
    async createComment() {
      return root;
    },
    async updateComment() {
      return root;
    },
    async softDeleteComment() {
      return root;
    },
    async toggleLike() {
      return { liked: true, likeCount: 1 };
    },
    async markRootCommentResolved() {
      return root;
    },
    async reopenRootComment() {
      return root;
    },
    async listCreatorLearnerDoubts() {
      return [];
    },
    async listNodeDiscussionPreview() {
      return buildPreview({
        nodeType: 'question',
        courseCreatorUserId: 'creator-1',
      });
    },
    async getCommentById() {
      return root;
    },
    async canUserCommentOnNode() {
      return true;
    },
  };
  const finance: Pick<FinanceRepository, 'getActiveEntitlement'> = {
    async getActiveEntitlement() {
      return null;
    },
  };
  const service = new NodeDiscussionApplicationService(
    repo,
    finance as FinanceRepository
  );

  await assert.rejects(
    () => service.markRootCommentResolved(viewer({ id: 'learner-2', role: 'learner' }), 'root-2'),
    /only the course creator can resolve/i
  );
});

test('creator cannot resolve a top-level comment unless it is tagged as doubt', async () => {
  const root = buildComment({
    id: 'root-3',
    authorUserId: 'learner-1',
    commentTag: 'discussion',
    status: 'open',
  });

  const repo: NodeDiscussionRepository = {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      return buildPreview().thread;
    },
    async listCommentsByNodeId() {
      return [
        {
          ...root,
          author: {
            userId: 'learner-1',
            fullName: 'Learner 1',
            primaryRole: 'learner',
            profilePhotoUrl: null,
            bio: null,
            isBanned: false,
          },
          viewerHasLiked: false,
          canEdit: false,
          canDelete: false,
          canReply: true,
          canResolve: false,
          canReopen: false,
        },
      ];
    },
    async createComment() {
      return root;
    },
    async updateComment() {
      return root;
    },
    async softDeleteComment() {
      return root;
    },
    async toggleLike() {
      return { liked: false, likeCount: 0 };
    },
    async markRootCommentResolved() {
      return root;
    },
    async reopenRootComment() {
      return root;
    },
    async listCreatorLearnerDoubts() {
      return [];
    },
    async listNodeDiscussionPreview() {
      return buildPreview({
        courseCreatorUserId: 'creator-1',
      });
    },
    async getCommentById() {
      return root;
    },
    async canUserCommentOnNode() {
      return true;
    },
  };
  const finance: Pick<FinanceRepository, 'getActiveEntitlement'> = {
    async getActiveEntitlement() {
      return null;
    },
  };
  const service = new NodeDiscussionApplicationService(
    repo,
    finance as FinanceRepository
  );

  await assert.rejects(
    () => service.markRootCommentResolved(viewer({ id: 'creator-1', role: 'creator' }), 'root-3'),
    /tagged as doubt/i
  );
});

test('like toggle remains idempotent by alternating states', async () => {
  let liked = false;
  let count = 0;
  const comment = buildComment({ id: 'comment-like' });
  const repo: NodeDiscussionRepository = {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      return buildPreview().thread;
    },
    async listCommentsByNodeId() {
      return [];
    },
    async createComment() {
      return comment;
    },
    async updateComment() {
      return comment;
    },
    async softDeleteComment() {
      return comment;
    },
    async toggleLike() {
      liked = !liked;
      count = liked ? 1 : 0;
      return { liked, likeCount: count };
    },
    async markRootCommentResolved() {
      return comment;
    },
    async reopenRootComment() {
      return comment;
    },
    async listCreatorLearnerDoubts() {
      return [];
    },
    async listNodeDiscussionPreview() {
      return buildPreview();
    },
    async getCommentById() {
      return comment;
    },
    async canUserCommentOnNode() {
      return true;
    },
  };
  const finance: Pick<FinanceRepository, 'getActiveEntitlement'> = {
    async getActiveEntitlement() {
      return null;
    },
  };
  const service = new NodeDiscussionApplicationService(
    repo,
    finance as FinanceRepository
  );

  const actor = viewer({ id: 'learner-1', role: 'learner' });
  const first = await service.toggleLike(actor, 'comment-like');
  assert.equal(first.liked, true);
  assert.equal(first.likeCount, 1);

  const second = await service.toggleLike(actor, 'comment-like');
  assert.equal(second.liked, false);
  assert.equal(second.likeCount, 0);
});


