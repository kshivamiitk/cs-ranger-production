import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { nodeDiscussionUpdateCommentSchema } from '@/src/presentation/schemas';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await context.params;
    const parsed = nodeDiscussionUpdateCommentSchema.parse(await request.json());
    const { authService, nodeDiscussionService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const comment = await nodeDiscussionService.updateComment(viewer, commentId, parsed);
    return ok({ comment });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ commentId: string }> }
) {
  try {
    const { commentId } = await context.params;
    const { authService, nodeDiscussionService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const comment = await nodeDiscussionService.softDeleteComment(viewer, commentId);
    return ok({ comment });
  } catch (error) {
    return failure(error);
  }
}


