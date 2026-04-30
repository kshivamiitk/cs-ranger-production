import assert from 'node:assert/strict';
import test from 'node:test';

import { NodeBookmarkQueryService } from '@/src/application/NodeBookmarkQueryService';
import type {
  CourseRepository,
  FinanceRepository,
  NodeBookmarkRepository,
} from '@/src/domain/ports';
import type {
  CourseEntitlement,
  CourseOverview,
  CourseTreeDetail,
  NodeBookmarkEntry,
  Viewer,
} from '@/src/domain/models';

function viewer(input: { id: string; role: 'learner' | 'creator'; isAdmin?: boolean }): Viewer {
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

function bookmarkEntry(): NodeBookmarkEntry {
  return {
    learnerUserId: 'learner-1',
    courseId: 'course-1',
    moduleId: 'module-1',
    nodeId: 'node-1',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

function courseOverview(overrides?: Partial<CourseOverview>): CourseOverview {
  return {
    id: 'course-1',
    creatorUserId: 'creator-1',
    title: 'Course',
    slug: 'course',
    description: 'Description',
    imageUrl: null,
    priceAmount: 0,
    premiumEnabled: false,
    premiumAccessDays: null,
    premiumUpdatedAt: null,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    moduleCount: 1,
    nodeCount: 1,
    premiumNodeCount: 0,
    engagement: {
      wishlistCount: 0,
      averageRating: 0,
      totalReviews: 0,
      activeLearnerCount: 0,
    },
    ...overrides,
  };
}

function courseTree(overrides?: Partial<CourseTreeDetail>): CourseTreeDetail {
  return {
    id: 'course-1',
    creatorUserId: 'creator-1',
    title: 'Course',
    slug: 'course',
    description: 'Description',
    imageUrl: null,
    priceAmount: 0,
    premiumEnabled: false,
    premiumAccessDays: null,
    premiumUpdatedAt: null,
    status: 'published',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    creatorName: 'Creator',
    modules: [
      {
        id: 'module-1',
        courseId: 'course-1',
        title: 'Module 1',
        summary: 'Summary',
        position: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        nodes: [
          {
            id: 'node-1',
            moduleId: 'module-1',
            type: 'content',
            title: 'Node 1',
            isPremium: false,
            excerpt: 'Excerpt',
            position: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
      },
    ],
    ...overrides,
  };
}

function createBookmarkRepositoryDouble(entries: NodeBookmarkEntry[]): NodeBookmarkRepository {
  return {
    async listBookmarksByLearner() {
      return entries;
    },
    async listBookmarkedNodeIds() {
      return entries.map((entry) => entry.nodeId);
    },
    async addBookmark() {
      throw new Error('Not used');
    },
    async removeBookmark() {
      throw new Error('Not used');
    },
  };
}

function createCourseRepositoryDouble(
  tree: CourseTreeDetail,
  overview: CourseOverview
): CourseRepository {
  return {
    async createCourse() { throw new Error('Not used'); },
    async updateCourse() { throw new Error('Not used'); },
    async getCourseById() { throw new Error('Not used'); },
    async getCourseDetailById() { throw new Error('Not used'); },
    async getCourseTreeById() { throw new Error('Not used'); },
    async listCourseTreesByIds() { return [tree]; },
    async listCourseOverviewsByIds() { return [overview]; },
    async getReadableNodeById() { throw new Error('Not used'); },
    async listCreatorCourses() { return []; },
    async listPublishedCourses() { return []; },
    async listPublishedCoursesByCreator() { return []; },
    async createModule() { throw new Error('Not used'); },
    async updateModule() { throw new Error('Not used'); },
    async deleteModule() { throw new Error('Not used'); },
    async reorderModules() { throw new Error('Not used'); },
    async createNode() { throw new Error('Not used'); },
    async updateNode() { throw new Error('Not used'); },
    async deleteNode() { throw new Error('Not used'); },
    async reorderNodes() { throw new Error('Not used'); },
    async saveQuizAttempt() { throw new Error('Not used'); },
  };
}

function createFinanceRepositoryDouble(
  entitlement: CourseEntitlement | null = null
): Pick<FinanceRepository, 'getActiveEntitlement' | 'listActiveEntitlements'> {
  return {
    async getActiveEntitlement() {
      return entitlement;
    },
    async listActiveEntitlements() {
      return entitlement ? [entitlement] : [];
    },
  };
}

test('bookmark state reports saved node for eligible viewer', async () => {
  const service = new NodeBookmarkQueryService(
    createBookmarkRepositoryDouble([bookmarkEntry()]),
    createCourseRepositoryDouble(courseTree(), courseOverview()),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const state = await service.getNodeBookmarkState(viewer({ id: 'learner-1', role: 'learner' }), {
    nodeId: 'node-1',
  });

  assert.equal(state.isBookmarked, true);
  assert.equal(state.canBookmark, true);
});

test('bookmark state remains available for creator viewers', async () => {
  const service = new NodeBookmarkQueryService(
    createBookmarkRepositoryDouble([]),
    createCourseRepositoryDouble(courseTree(), courseOverview()),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const state = await service.getNodeBookmarkState(viewer({ id: 'creator-2', role: 'creator' }), {
    nodeId: 'node-1',
  });

  assert.equal(state.isBookmarked, false);
  assert.equal(state.canBookmark, true);
});

test('bookmark list keeps saved node visible even when premium access is currently locked', async () => {
  const entry = bookmarkEntry();
  const service = new NodeBookmarkQueryService(
    createBookmarkRepositoryDouble([entry]),
    createCourseRepositoryDouble(
      courseTree({
        premiumEnabled: true,
        priceAmount: 499,
        premiumAccessDays: 30,
        modules: [
          {
            id: 'module-1',
            courseId: 'course-1',
            title: 'Module 1',
            summary: 'Summary',
            position: 1,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            nodes: [
              {
                id: 'node-1',
                moduleId: 'module-1',
                type: 'content',
                title: 'Premium node',
                isPremium: true,
                excerpt: 'Saved earlier',
                position: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        ],
      }),
      courseOverview({
        premiumEnabled: true,
        priceAmount: 499,
        premiumAccessDays: 30,
        premiumNodeCount: 1,
      })
    ),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const items = await service.getBookmarkedNodesView(viewer({ id: 'learner-1', role: 'learner' }));
  assert.equal(items.length, 1);
  assert.equal(items[0]?.nodeId, 'node-1');
  assert.equal(items[0]?.isLocked, true);
});


