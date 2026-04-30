import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { nodeDiscussionCreateCommentSchema } from '@/src/presentation/schemas';

export async function GET(
  _request: Request,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;
    const { authService, nodeDiscussionQueryService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext('dark');
    const discussion = await nodeDiscussionQueryService.getNodeDiscussionView(viewer, nodeId);
    return ok({ discussion });
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;
    const parsed = nodeDiscussionCreateCommentSchema.parse(await request.json());
    const { authService, nodeDiscussionService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const comment = await nodeDiscussionService.createComment(viewer, nodeId, parsed);
    return ok({ comment });
  } catch (error) {
    return failure(error);
  }
}


