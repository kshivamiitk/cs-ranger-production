import assert from 'node:assert/strict';
import test from 'node:test';

import { CourseReviewApplicationService } from '@/src/application/CourseReviewApplicationService';
import type { CourseRepository, CourseReviewRepository, FinanceRepository } from '@/src/domain/ports';
import type { Course, CourseEntitlement, CourseReview, Viewer } from '@/src/domain/models';

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

function createRepositoryDouble(options?: {
  canReview?: boolean;
  initialReview?: CourseReview | null;
}): CourseReviewRepository {
  const reviews = new Map<string, CourseReview>();
  if (options?.initialReview) {
    reviews.set(`${options.initialReview.courseId}:${options.initialReview.reviewerUserId}`, options.initialReview);
  }

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
    async upsertCourseReview(input) {
      const key = `${input.courseId}:${input.reviewerUserId}`;
      const current = reviews.get(key);
      if (current) {
        const updated: CourseReview = {
          ...current,
          rating: input.rating,
          reviewText: input.reviewText,
          isEdited: true,
          isDeleted: false,
          updatedAt: new Date().toISOString(),
        };
        reviews.set(key, updated);
        return updated;
      }

      const created: CourseReview = {
        id: `review-${reviews.size + 1}`,
        courseId: input.courseId,
        reviewerUserId: input.reviewerUserId,
        rating: input.rating,
        reviewText: input.reviewText,
        isEdited: false,
        isDeleted: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      reviews.set(key, created);
      return created;
    },
    async softDeleteCourseReview(reviewId, actorUserId) {
      const found = Array.from(reviews.values()).find(
        (entry) => entry.id === reviewId && entry.reviewerUserId === actorUserId
      );
      if (!found) {
        throw new Error('Review not found.');
      }
      const deleted = {
        ...found,
        isDeleted: true,
        updatedAt: new Date().toISOString(),
      };
      reviews.set(`${deleted.courseId}:${deleted.reviewerUserId}`, deleted);
      return deleted;
    },
    async getReviewerReviewForCourse(courseId, reviewerUserId) {
      return reviews.get(`${courseId}:${reviewerUserId}`) ?? null;
    },
    async canUserReviewCourse() {
      return options?.canReview ?? true;
    },
  };
}

function createCourseRepositoryDouble(course?: Partial<Course>): CourseRepository {
  const value: Course = {
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
    ...course,
  };

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

function createFinanceRepositoryDouble(
  entitlement: CourseEntitlement | null = null
): Pick<FinanceRepository, 'getActiveEntitlement'> {
  return {
    async getActiveEntitlement() {
      return entitlement;
    },
  };
}

test('review upsert keeps one reviewer review per course', async () => {
  const repository = createRepositoryDouble();
  const service = new CourseReviewApplicationService(
    createCourseRepositoryDouble(),
    repository,
    createFinanceRepositoryDouble() as FinanceRepository
  );
  const reviewer = viewer({ id: 'learner-1', role: 'learner' });

  const first = await service.upsertCourseReview(reviewer, 'course-1', {
    rating: 4,
    reviewText: 'Solid course.',
  });
  const second = await service.upsertCourseReview(reviewer, 'course-1', {
    rating: 5,
    reviewText: 'Updated feedback after completion.',
  });

  assert.equal(first.id, second.id);
  assert.equal(second.rating, 5);
  assert.equal(second.reviewText, 'Updated feedback after completion.');
});

test('course owner cannot review their own course', async () => {
  const repository = createRepositoryDouble({ canReview: false });
  const service = new CourseReviewApplicationService(
    createCourseRepositoryDouble({
      id: 'course-owner',
      creatorUserId: 'creator-1',
    }),
    repository,
    createFinanceRepositoryDouble() as FinanceRepository
  );
  const ownerViewer = viewer({ id: 'creator-1', role: 'creator' });

  await assert.rejects(
    () =>
      service.upsertCourseReview(ownerViewer, 'course-owner', {
        rating: 5,
        reviewText: 'Should be blocked.',
      }),
    /own course/i
  );
});

test('signed-in user without premium access cannot review a premium course', async () => {
  const repository = createRepositoryDouble({ canReview: false });
  const service = new CourseReviewApplicationService(
    createCourseRepositoryDouble({
      id: 'course-2',
      premiumEnabled: true,
      priceAmount: 499,
      premiumAccessDays: 30,
    }),
    repository,
    createFinanceRepositoryDouble() as FinanceRepository
  );
  const reviewer = viewer({ id: 'creator-2', role: 'creator' });

  await assert.rejects(
    () =>
      service.upsertCourseReview(reviewer, 'course-2', {
        rating: 4,
        reviewText: 'Should be blocked.',
      }),
    /unlock this course/i
  );
});

test('review upsert relies on shared app eligibility even if db helper drifts false', async () => {
  const repository = createRepositoryDouble({ canReview: false });
  const service = new CourseReviewApplicationService(
    createCourseRepositoryDouble({
      id: 'course-free',
      premiumEnabled: false,
      priceAmount: 0,
      premiumAccessDays: null,
    }),
    repository,
    createFinanceRepositoryDouble() as FinanceRepository
  );
  const reviewer = viewer({ id: 'user-2', role: 'creator' });

  const review = await service.upsertCourseReview(reviewer, 'course-free', {
    rating: 5,
    reviewText: 'Visible and submittable.',
  });

  assert.equal(review.rating, 5);
  assert.equal(review.reviewerUserId, 'user-2');
});

test('authenticated creator can review another published free course', async () => {
  const repository = createRepositoryDouble({ canReview: true });
  const service = new CourseReviewApplicationService(
    createCourseRepositoryDouble({
      id: 'course-creator-free',
      creatorUserId: 'creator-9',
    }),
    repository,
    createFinanceRepositoryDouble() as FinanceRepository
  );
  const creatorViewer = viewer({ id: 'creator-2', role: 'creator' });

  const review = await service.upsertCourseReview(creatorViewer, 'course-creator-free', {
    rating: 4,
    reviewText: 'A creator account can review another creator course.',
  });

  assert.equal(review.reviewerUserId, 'creator-2');
});

test('authenticated admin can review another published free course', async () => {
  const repository = createRepositoryDouble({ canReview: true });
  const service = new CourseReviewApplicationService(
    createCourseRepositoryDouble({
      id: 'course-3',
      creatorUserId: 'creator-9',
    }),
    repository,
    createFinanceRepositoryDouble() as FinanceRepository
  );
  const adminViewer = viewer({ id: 'admin-1', role: 'learner', isAdmin: true });

  const review = await service.upsertCourseReview(adminViewer, 'course-3', {
    rating: 5,
    reviewText: 'Works for a free course.',
  });

  assert.equal(review.reviewerUserId, 'admin-1');
});


