import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function POST(
  _request: Request,
  context: { params: Promise<{ inviteId: string }> },
) {
  try {
    const { inviteId } = await context.params;
    const { authService, courseCollaborationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const invite = await courseCollaborationService.acceptInvite(viewer, inviteId);
    return ok({ invite });
  } catch (error) {
    return failure(error);
  }
}


