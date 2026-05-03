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
    const result = await nodeDiscussionService.toggleLike(viewer, commentId);
    invalidatePublicNodeDiscussionCache();
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}
