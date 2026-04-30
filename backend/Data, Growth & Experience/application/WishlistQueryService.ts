import type { CatalogCourseSummary, MostSavedCourseSummary, Viewer, WishlistedCourseView } from '@/src/domain/models';
import type { WishlistRepository } from '@/src/domain/ports';
import { viewerCanUseWishlist } from '@/src/domain/learnerProgress';

export class WishlistQueryService {
  constructor(private readonly wishlistRepository: WishlistRepository) {}

  async getWishlistStateMap(viewer: Viewer | null, courseIds: string[]) {
    const defaultMap = new Map(
      courseIds.map((courseId) => [
        courseId,
        {
          courseId,
          isWishlisted: false,
          wishlistCount: 0,
          canWishlist: false,
        },
      ])
    );

    if (!viewer || !viewerCanUseWishlist(viewer) || courseIds.length === 0) {
      return defaultMap;
    }

    const states = await this.wishlistRepository.listWishlistStates({
      learnerUserId: viewer.user.id,
      courseIds,
    });

    for (const state of states) {
      defaultMap.set(state.courseId, state);
    }

    return defaultMap;
  }

  async getLearnerWishlist(viewer: Viewer, courses: CatalogCourseSummary[]): Promise<WishlistedCourseView[]> {
    if (!viewerCanUseWishlist(viewer)) {
      return [];
    }

    const entries = await this.wishlistRepository.listWishlistEntriesForLearner(viewer.user.id);
    const courseById = new Map(courses.map((course) => [course.id, course]));

    return entries
      .map((entry) => {
        const course = courseById.get(entry.courseId);
        if (!course) {
          return null;
        }

        return {
          savedAt: entry.createdAt,
          course,
        } satisfies WishlistedCourseView;
      })
      .filter((value): value is WishlistedCourseView => Boolean(value));
  }

  async listMostSavedCourses(limit: number): Promise<MostSavedCourseSummary[]> {
    return this.wishlistRepository.listMostSavedCourses(limit);
  }
}


