import assert from 'node:assert/strict';
import test from 'node:test';

import { CourseReviewQueryService } from '@/src/application/CourseReviewQueryService';
import type { CourseRepository, CourseReviewRepository, FinanceRepository } from '@/src/domain/ports';
import type { Course, CourseEntitlement, CourseReview, Viewer } from '@/src/domain/models';

function viewer(input: { id: string; role: 'learner' | 'creator'; isAdmin?: boolean; isBanned?: boolean }): Viewer {
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
      isBanned: Boolean(input.isBanned),
    },
  };
}

function course(overrides?: Partial<Course>): Course {
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
    ...overrides,
  };
}

function createCourseRepositoryDouble(value: Course): CourseRepository {
  return {
    async createCourse() { throw new Error('Not used'); },
    async updateCourse() { throw new Error('Not used'); },
    async getCourseById(courseId) { return courseId === value.id ? value : null; },
    async getCourseDetailById() { throw new Error('Not used'); },
    async getCourseTreeById() { throw new Error('Not used'); },
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

function createReviewRepositoryDouble(options?: {
  ownReview?: CourseReview | null;
  canReviewByDb?: boolean;
}): CourseReviewRepository {
  return {
    async listCourseReviews() {
      return [];
    },
    async getCourseReviewSummary(courseId) {
      return {
        courseId,
        averageRating: 0,
        totalReviews: 0,
        ratingBreakdown: { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 },
      };
    },
    async upsertCourseReview() {
      throw new Error('Not used');
    },
    async softDeleteCourseReview() {
      throw new Error('Not used');
    },
    async getReviewerReviewForCourse() {
      return options?.ownReview ?? null;
    },
    async canUserReviewCourse() {
      return options?.canReviewByDb ?? true;
    },
  };
}

function createFinanceRepositoryDouble(
  entitlement: CourseEntitlement | null = null
): Pick<FinanceRepository, 'getActiveEntitlement'> {
  return {
    async getActiveEntitlement() {
      return entitlement;
    },
  };
}

test('signed-out viewer sees sign-in reason for reviews', async () => {
  const service = new CourseReviewQueryService(
    createCourseRepositoryDouble(course()),
    createReviewRepositoryDouble(),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const view = await service.getCourseReviewsView(null, 'course-1');
  assert.equal(view.canReview, false);
  assert.match(view.canReviewReason ?? '', /sign in/i);
});

test('course owner sees own-course review block reason', async () => {
  const service = new CourseReviewQueryService(
    createCourseRepositoryDouble(course({ creatorUserId: 'creator-1' })),
    createReviewRepositoryDouble(),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const view = await service.getCourseReviewsView(viewer({ id: 'creator-1', role: 'creator' }), 'course-1');
  assert.equal(view.canReview, false);
  assert.match(view.canReviewReason ?? '', /own course/i);
});

test('premium course requires entitlement for review access', async () => {
  const service = new CourseReviewQueryService(
    createCourseRepositoryDouble(
      course({
        premiumEnabled: true,
        priceAmount: 499,
        premiumAccessDays: 30,
      })
    ),
    createReviewRepositoryDouble(),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const view = await service.getCourseReviewsView(viewer({ id: 'user-1', role: 'creator' }), 'course-1');
  assert.equal(view.canReview, false);
  assert.match(view.canReviewReason ?? '', /unlock this course/i);
});

test('premium course allows reviews when viewer has premium access without entitlement (admin)', async () => {
  const service = new CourseReviewQueryService(
    createCourseRepositoryDouble(
      course({
        premiumEnabled: true,
        priceAmount: 499,
        premiumAccessDays: 30,
      })
    ),
    createReviewRepositoryDouble(),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const view = await service.getCourseReviewsView(
    viewer({ id: 'admin-1', role: 'creator', isAdmin: true }),
    'course-1'
  );
  assert.equal(view.canReview, true);
  assert.equal(view.canReviewReason, null);
});

test('query view still enables reviews when local eligibility passes and db helper is stale', async () => {
  const service = new CourseReviewQueryService(
    createCourseRepositoryDouble(course({ premiumEnabled: false, priceAmount: 0, premiumAccessDays: null })),
    createReviewRepositoryDouble({ canReviewByDb: false }),
    createFinanceRepositoryDouble() as FinanceRepository
  );

  const view = await service.getCourseReviewsView(viewer({ id: 'user-2', role: 'creator' }), 'course-1');
  assert.equal(view.canReview, true);
  assert.equal(view.canReviewReason, null);
});


