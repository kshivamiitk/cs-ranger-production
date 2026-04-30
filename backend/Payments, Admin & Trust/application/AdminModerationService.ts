import { ApplicationError } from '@/src/application/errors';
import type { Viewer } from '@/src/domain/models';
import type { AdminRepository, UserProfileRepository } from '@/src/domain/ports';

export class AdminModerationService {
  constructor(
    private readonly adminRepository: AdminRepository,
    private readonly userProfileRepository: UserProfileRepository
  ) {}

  async banUser(
    adminViewer: Viewer,
    input: {
      targetUserId: string;
      sourceMessageId?: string | null;
      reason?: string | null;
    }
  ) {
    this.assertAdmin(adminViewer);

    if (input.targetUserId === adminViewer.user.id) {
      throw new ApplicationError('Admins cannot ban themselves from the product.', 400);
    }

    const profile = await this.userProfileRepository.setBannedState(input.targetUserId, true);
    const action = await this.adminRepository.createModerationAction({
      adminUserId: adminViewer.user.id,
      targetUserId: input.targetUserId,
      sourceMessageId: input.sourceMessageId ?? null,
      actionType: 'ban',
      reason: input.reason ?? null,
    });

    return {
      profile,
      action,
    };
  }

  async unbanUser(
    adminViewer: Viewer,
    input: {
      targetUserId: string;
      sourceMessageId?: string | null;
      reason?: string | null;
    }
  ) {
    this.assertAdmin(adminViewer);

    const profile = await this.userProfileRepository.setBannedState(input.targetUserId, false);
    const action = await this.adminRepository.createModerationAction({
      adminUserId: adminViewer.user.id,
      targetUserId: input.targetUserId,
      sourceMessageId: input.sourceMessageId ?? null,
      actionType: 'unban',
      reason: input.reason ?? null,
    });

    return {
      profile,
      action,
    };
  }

  private assertAdmin(viewer: Viewer) {
    if (!viewer.profile.isAdmin) {
      throw new ApplicationError('Admin access is required.', 403);
    }
  }
}


