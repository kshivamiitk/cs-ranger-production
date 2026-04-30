import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function POST(
  _request: Request,
  context: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { courseId, nodeId } = await context.params;
    const { authService, nodeBookmarkService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const bookmark = await nodeBookmarkService.saveBookmark(viewer, { courseId, nodeId });
    return ok({ bookmark });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ courseId: string; nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;
    const { authService, nodeBookmarkService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    await nodeBookmarkService.removeBookmark(viewer, { nodeId });
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


