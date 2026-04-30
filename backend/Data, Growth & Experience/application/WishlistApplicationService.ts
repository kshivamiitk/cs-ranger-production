import { ApplicationError, requireValue } from '@/src/application/errors';
import { viewerCanUseWishlist } from '@/src/domain/learnerProgress';
import type { CourseRepository, WishlistRepository } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class WishlistApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly wishlistRepository: WishlistRepository
  ) {}

  async saveCourse(viewer: Viewer, courseId: string) {
    const course = await this.requireWishlistCourse(viewer, courseId);
    return this.wishlistRepository.addWishlistEntry({
      courseId: course.id,
      learnerUserId: viewer.user.id,
    });
  }

  async removeCourse(viewer: Viewer, courseId: string) {
    await this.requireWishlistCourse(viewer, courseId);
    await this.wishlistRepository.removeWishlistEntry({
      courseId,
      learnerUserId: viewer.user.id,
    });
  }

  private async requireWishlistCourse(viewer: Viewer, courseId: string) {
    if (!viewerCanUseWishlist(viewer)) {
      throw new ApplicationError('Wishlist is available for learner accounts only.', 403);
    }

    const course = requireValue(await this.courseRepository.getCourseById(courseId), 'Course not found.');
    if (course.creatorUserId === viewer.user.id) {
      throw new ApplicationError('You cannot save your own course to wishlist.', 403);
    }

    if (course.status !== 'published') {
      throw new ApplicationError('Only published courses can be saved.', 403);
    }

    return course;
  }
}


