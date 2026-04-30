import { ApplicationError, requireValue } from '@/src/application/errors';
import type { CourseCollaborationRepository, UserProfileRepository } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class CourseCollaborationService {
  constructor(
    private readonly collaborationRepository: CourseCollaborationRepository,
    private readonly userProfileRepository: UserProfileRepository,
  ) {}

  async getCourseAccess(viewer: Viewer, courseId: string) {
    return this.collaborationRepository.getCourseAccess({
      courseId,
      userId: viewer.user.id,
    });
  }

  async listIncomingInvites(viewer: Viewer) {
    this.assertCreator(viewer);
    return this.collaborationRepository.listIncomingInvites(viewer.user.id);
  }

  async listCourseWorkspace(viewer: Viewer, courseId: string) {
    this.assertCreator(viewer);
    const access = await this.getCourseAccess(viewer, courseId);
    if (!access.canEditContent && !access.canManageCollaborators) {
      throw new ApplicationError('You do not have access to this course collaboration workspace.', 403);
    }

    const [collaborators, pendingInvites] = await Promise.all([
      this.collaborationRepository.listCourseCollaborators(courseId),
      access.canManageCollaborators ? this.collaborationRepository.listCoursePendingInvites(courseId) : Promise.resolve([]),
    ]);

    return {
      access,
      collaborators,
      pendingInvites,
    };
  }

  async searchCreatorsByUsername(viewer: Viewer, query: string) {
    this.assertCreator(viewer);
    return this.userProfileRepository.searchCreatorsByUsername({
      query,
      excludeUserId: viewer.user.id,
      limit: 8,
    });
  }

  async inviteCollaborator(viewer: Viewer, input: { courseId: string; username: string; message?: string | null }) {
    this.assertCreator(viewer);
    const invitee = requireValue(
      await this.userProfileRepository.getByUsername(input.username),
      'No creator was found with that username.',
      404,
    );

    if (invitee.primaryRole !== 'creator') {
      throw new ApplicationError('Only creator accounts can be invited as course collaborators.', 400);
    }

    return this.collaborationRepository.inviteCollaborator({
      courseId: input.courseId,
      inviterUserId: viewer.user.id,
      inviteeUserId: invitee.userId,
      message: input.message ?? null,
      role: 'editor',
    });
  }

  async acceptInvite(viewer: Viewer, inviteId: string) {
    this.assertCreator(viewer);
    return this.collaborationRepository.acceptInvite({ inviteId, userId: viewer.user.id });
  }

  async declineInvite(viewer: Viewer, inviteId: string) {
    this.assertCreator(viewer);
    return this.collaborationRepository.declineInvite({ inviteId, userId: viewer.user.id });
  }

  async revokeInvite(viewer: Viewer, inviteId: string) {
    this.assertCreator(viewer);
    return this.collaborationRepository.revokeInvite({ inviteId, userId: viewer.user.id });
  }

  async removeCollaborator(viewer: Viewer, courseId: string, collaboratorUserId: string) {
    this.assertCreator(viewer);
    await this.collaborationRepository.removeCollaborator({
      courseId,
      actorUserId: viewer.user.id,
      collaboratorUserId,
    });
  }

  private assertCreator(viewer: Viewer) {
    if (viewer.profile.primaryRole !== 'creator') {
      throw new ApplicationError('Creator access is required.', 403);
    }
  }
}


