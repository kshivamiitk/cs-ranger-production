import assert from 'node:assert/strict';
import test from 'node:test';

import { NodeBookmarkApplicationService } from '@/src/application/NodeBookmarkApplicationService';
import type {
  CourseRepository,
  NodeBookmarkRepository,
} from '@/src/domain/ports';
import type {
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

function courseTree(overrides?: Partial<CourseTreeDetail>): CourseTreeDetail {
  return {
    id: 'course-1',
    creatorUserId: 'creator-1',
    title: 'Course',
    slug: 'course',
    description: 'Course description',
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

function createCourseRepositoryDouble(tree: CourseTreeDetail): CourseRepository {
  return {
    async createCourse() { throw new Error('Not used'); },
    async updateCourse() { throw new Error('Not used'); },
    async getCourseById() { throw new Error('Not used'); },
    async getCourseDetailById() { throw new Error('Not used'); },
    async getCourseTreeById(courseId) { return courseId === tree.id ? tree : null; },
    async listCourseTreesByIds() { return []; },
    async listCourseOverviewsByIds() { return []; },
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

function createBookmarkRepositoryDouble() {
  const entries = new Map<string, NodeBookmarkEntry>();

  const repository: NodeBookmarkRepository = {
    async listBookmarksByLearner(learnerUserId) {
      return Array.from(entries.values()).filter((entry) => entry.learnerUserId === learnerUserId);
    },
    async listBookmarkedNodeIds(input) {
      return Array.from(entries.values())
        .filter((entry) => entry.learnerUserId === input.learnerUserId && input.nodeIds.includes(entry.nodeId))
        .map((entry) => entry.nodeId);
    },
    async addBookmark(input) {
      const created: NodeBookmarkEntry = {
        learnerUserId: input.learnerUserId,
        courseId: input.courseId,
        moduleId: input.moduleId,
        nodeId: input.nodeId,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      entries.set(`${input.learnerUserId}:${input.nodeId}`, created);
      return created;
    },
    async removeBookmark(input) {
      entries.delete(`${input.learnerUserId}:${input.nodeId}`);
    },
  };

  return {
    repository,
    entries,
  };
}

test('learner can bookmark an accessible node and remove it later', async () => {
  const bookmarks = createBookmarkRepositoryDouble();
  const service = new NodeBookmarkApplicationService(
    createCourseRepositoryDouble(courseTree()),
    bookmarks.repository
  );
  const learner = viewer({ id: 'learner-1', role: 'learner' });

  const saved = await service.saveBookmark(learner, { courseId: 'course-1', nodeId: 'node-1' });
  assert.equal(saved.nodeId, 'node-1');
  assert.equal(bookmarks.entries.size, 1);

  await service.removeBookmark(learner, { nodeId: 'node-1' });
  assert.equal(bookmarks.entries.size, 0);
});

test('creator can bookmark an accessible published node', async () => {
  const bookmarks = createBookmarkRepositoryDouble();
  const service = new NodeBookmarkApplicationService(
    createCourseRepositoryDouble(courseTree()),
    bookmarks.repository
  );

  const saved = await service.saveBookmark(viewer({ id: 'creator-2', role: 'creator' }), {
    courseId: 'course-1',
    nodeId: 'node-1',
  });

  assert.equal(saved.nodeId, 'node-1');
  assert.equal(bookmarks.entries.size, 1);
});

test('premium node can be bookmarked for future learning', async () => {
  const bookmarks = createBookmarkRepositoryDouble();
  const service = new NodeBookmarkApplicationService(
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
                excerpt: null,
                position: 1,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              },
            ],
          },
        ],
      })
    ),
    bookmarks.repository
  );

  const saved = await service.saveBookmark(viewer({ id: 'learner-1', role: 'learner' }), {
    courseId: 'course-1',
    nodeId: 'node-1',
  });

  assert.equal(saved.nodeId, 'node-1');
  assert.equal(bookmarks.entries.size, 1);
});


