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
    const progress = await learnerProgressService.markNodeComplete(viewer, { courseId, nodeId });
    return ok({ progress });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await context.params;
    const { authService, learnerProgressService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    await learnerProgressService.markNodeIncomplete(viewer, { courseId, nodeId });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


