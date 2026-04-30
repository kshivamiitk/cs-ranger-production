import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function POST(
  _request: Request,
  context: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await context.params;
    const { authService, learnerProgressService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const lastVisited = await learnerProgressService.setLastVisitedNode(viewer, { courseId, nodeId });
    return ok({ lastVisited });
  } catch (error) {
    return failure(error);
  }
}


