import assert from 'node:assert/strict';
import test from 'node:test';

import { SearchService } from '@/src/application/SearchService';
import type { CourseRepository, SearchRepository } from '@/src/domain/ports';
import type { TopCreatorsView, Viewer } from '@/src/domain/models';

function viewer(userId: string): Viewer {
  return {
    user: {
      id: userId,
      email: `${userId}@example.com`,
      fullName: userId,
    },
    profile: {
      userId,
      fullName: userId,
      primaryRole: 'learner',
      themeMode: 'dark',
      profilePhotoUrl: null,
      bio: null,
      isAdmin: false,
      isBanned: false,
    },
  };
}

function emptyTopCreatorsView(): TopCreatorsView {
  return {
    byFollowers: [],
    byContributions: [],
  };
}

test('listTopCreators forwards viewer identity and limit into the discovery repository', async () => {
  let captured: { viewerUserId?: string | null; limit?: number } | null = null;

  const searchRepository: SearchRepository = {
    async searchEverything() {
      return { modules: [], nodes: [], creators: [] };
    },
    async listTopCreators(input) {
      captured = input;
      return emptyTopCreatorsView();
    },
  };

  const courseRepository = {
    async listPublishedCourses() {
      return [];
    },
  } as unknown as CourseRepository;

  const catalogCourseSummaryQueryService = {
    async buildSummaries() {
      return [];
    },
  };

  const service = new SearchService(
    searchRepository,
    courseRepository,
    catalogCourseSummaryQueryService as never
  );

  await service.listTopCreators(viewer('learner-1'), 8);

  assert.deepEqual(captured, {
    viewerUserId: 'learner-1',
    limit: 8,
  });
});


