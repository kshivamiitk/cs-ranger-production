import { ApplicationError, requireValue } from '@/src/application/errors';
import type {
  CourseRepository,
  NodeBookmarkRepository,
} from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class NodeBookmarkApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly nodeBookmarkRepository: NodeBookmarkRepository
  ) {}

  async saveBookmark(viewer: Viewer, input: { courseId: string; nodeId: string }) {
    const target = await this.requireBookmarkableNode(viewer, input);
    return this.nodeBookmarkRepository.addBookmark({
      learnerUserId: viewer.user.id,
      courseId: input.courseId,
      moduleId: target.module.id,
      nodeId: target.node.id,
    });
  }

  async removeBookmark(viewer: Viewer, input: { nodeId: string }) {
    this.ensureBookmarkAccess(viewer);

    await this.nodeBookmarkRepository.removeBookmark({
      learnerUserId: viewer.user.id,
      nodeId: input.nodeId,
    });
  }

  private async requireBookmarkableNode(viewer: Viewer, input: { courseId: string; nodeId: string }) {
    this.ensureBookmarkAccess(viewer);

    const course = requireValue(
      await this.courseRepository.getCourseTreeById(input.courseId),
      'Course not found.'
    );

    if (
      course.status !== 'published' &&
      course.creatorUserId !== viewer.user.id &&
      !viewer.profile.isAdmin
    ) {
      throw new ApplicationError('Only accessible course nodes can be bookmarked.', 403);
    }

    for (const module of course.modules) {
      const node = module.nodes.find((entry) => entry.id === input.nodeId);
      if (!node) {
        continue;
      }

      return {
        course,
        module,
        node,
      };
    }

    throw new ApplicationError('Node not found.', 404);
  }

  private ensureBookmarkAccess(viewer: Viewer) {
    if (viewer.profile.isBanned) {
      throw new ApplicationError('Blocked accounts cannot use node bookmarks.', 403);
    }
  }
}


