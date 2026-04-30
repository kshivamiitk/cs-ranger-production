import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function POST(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await context.params;
    const { authService, nodeDiscussionService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const comment = await nodeDiscussionService.reopenRootComment(viewer, commentId);
    return ok({ comment });
  } catch (error) {
    return failure(error);
  }
}


