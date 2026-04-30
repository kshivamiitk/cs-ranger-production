import { ApplicationError } from '@/src/application/errors';
import type { Viewer } from '@/src/domain/models';
import type { AdminRepository } from '@/src/domain/ports';

export class AdminMessageService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async createMessage(
    viewer: Viewer,
    input: {
      subject: string | null;
      message: string;
      messageType: 'suggestion' | 'complaint' | 'support';
      targetUserId: string | null;
    }
  ) {
    return this.adminRepository.createAdminMessage({
      senderUserId: viewer.user.id,
      senderRole: viewer.profile.primaryRole,
      subject: input.subject,
      message: input.message,
      messageType: input.messageType,
      targetUserId: input.targetUserId,
    });
  }

  async listOwnMessages(viewer: Viewer) {
    return this.adminRepository.listSenderMessages(viewer.user.id);
  }

  async updateMessageStatus(
    adminViewer: Viewer,
    input: {
      messageId: string;
      status: 'open' | 'reviewed' | 'closed';
    }
  ) {
    if (!adminViewer.profile.isAdmin) {
      throw new ApplicationError('Admin access is required.', 403);
    }

    return this.adminRepository.updateAdminMessageStatus({
      messageId: input.messageId,
      status: input.status,
      reviewedByAdminUserId: adminViewer.user.id,
    });
  }
}


