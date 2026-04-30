import { ApplicationError, requireValue } from '@/src/application/errors';
import type { Viewer } from '@/src/domain/models';
import type { AdminRepository } from '@/src/domain/ports';

export class AdminQueryService {
  constructor(private readonly adminRepository: AdminRepository) {}

  async listInboxMessages(adminViewer: Viewer) {
    this.assertAdmin(adminViewer);
    return this.adminRepository.listAdminMessages();
  }

  // Backward-compatible alias while callers migrate.
  async listLearnerMessages(adminViewer: Viewer) {
    return this.listInboxMessages(adminViewer);
  }

  async getMessageDetail(adminViewer: Viewer, messageId: string) {
    this.assertAdmin(adminViewer);
    return requireValue(
      await this.adminRepository.getAdminMessageDetail(messageId),
      'Admin message not found.',
      404
    );
  }

  private assertAdmin(viewer: Viewer) {
    if (!viewer.profile.isAdmin) {
      throw new ApplicationError('Admin access is required.', 403);
    }
  }
}


