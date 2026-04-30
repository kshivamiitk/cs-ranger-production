import assert from 'node:assert/strict';
import test from 'node:test';

import { CreatorLearnerDoubtQueryService } from '@/src/application/CreatorLearnerDoubtQueryService';
import type { NodeDiscussionQueryService } from '@/src/application/NodeDiscussionQueryService';
import type { CreatorLearnerDoubtListItem, Viewer } from '@/src/domain/models';
import type { NodeDiscussionRepository } from '@/src/domain/ports';

function viewer(input: { id: string; role: 'learner' | 'creator' }): Viewer {
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
      isAdmin: false,
      isBanned: false,
    },
  };
}

function doubt(
  id: string,
  overrides?: Partial<CreatorLearnerDoubtListItem>
): CreatorLearnerDoubtListItem {
  return {
    commentId: id,
    threadId: 'thread-1',
    courseId: 'course-1',
    courseTitle: 'Course',
    courseCreatorUserId: 'creator-1',
    nodeId: 'node-1',
    nodeTitle: 'Question node',
    nodeType: 'question',
    learnerUserId: 'learner-1',
    learnerName: 'Learner',
    parentCommentId: null,
    status: 'open',
    isDeleted: false,
    commentBody: 'I need help here.',
    lastActivityAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

function createRepository(items: CreatorLearnerDoubtListItem[]): NodeDiscussionRepository {
  return {
    async getThreadByNodeId() {
      return null;
    },
    async getOrCreateThreadForNode() {
      throw new Error('Not used');
    },
    async listCommentsByNodeId() {
      return [];
    },
    async createComment() {
      throw new Error('Not used');
    },
    async updateComment() {
      throw new Error('Not used');
    },
    async softDeleteComment() {
      throw new Error('Not used');
    },
    async toggleLike() {
      throw new Error('Not used');
    },
    async markRootCommentResolved() {
      throw new Error('Not used');
    },
    async reopenRootComment() {
      throw new Error('Not used');
    },
    async listCreatorLearnerDoubts() {
      return items;
    },
    async listNodeDiscussionPreview() {
      return null;
    },
    async getCommentById() {
      return null;
    },
    async canUserCommentOnNode() {
      return false;
    },
  };
}

test('creator learner doubts query keeps only unresolved top-level comments for creator-owned courses', async () => {
  const repository = createRepository([
    doubt('valid'),
    doubt('creator-authored', { learnerUserId: 'creator-2', learnerName: 'Creator author' }),
    doubt('resolved', { status: 'resolved' }),
    doubt('deleted', { isDeleted: true }),
    doubt('reply', { parentCommentId: 'parent-1' }),
    doubt('content-node', { nodeType: 'content' }),
    doubt('other-creator', { courseCreatorUserId: 'creator-2' }),
  ]);
  const queryService = new CreatorLearnerDoubtQueryService(
    repository,
    {
      async getNodeDiscussionView() {
        throw new Error('Not used');
      },
    } as unknown as NodeDiscussionQueryService
  );

  const list = await queryService.listCreatorLearnerDoubts(viewer({ id: 'creator-1', role: 'creator' }));
  assert.deepEqual(list.map((item) => item.commentId), ['valid', 'creator-authored', 'content-node']);
});


