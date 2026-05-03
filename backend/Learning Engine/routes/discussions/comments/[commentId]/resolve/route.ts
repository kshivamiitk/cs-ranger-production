import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { invalidatePublicNodeDiscussionCache } from '@/shared/performance/nodeDiscussionCache';

export async function POST(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await context.params;
    const { authService, nodeDiscussionService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const comment = await nodeDiscussionService.markRootCommentResolved(viewer, commentId);
    invalidatePublicNodeDiscussionCache(comment.nodeId);
    return ok({ comment });
  } catch (error) {
    return failure(error);
  }
}
