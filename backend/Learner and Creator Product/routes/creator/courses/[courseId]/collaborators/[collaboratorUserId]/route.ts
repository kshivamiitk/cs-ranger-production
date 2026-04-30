import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ courseId: string; collaboratorUserId: string }> },
) {
  try {
    const { courseId, collaboratorUserId } = await context.params;
    const { authService, courseCollaborationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    await courseCollaborationService.removeCollaborator(viewer, courseId, collaboratorUserId);
    return ok({ removed: true });
  } catch (error) {
    return failure(error);
  }
}


