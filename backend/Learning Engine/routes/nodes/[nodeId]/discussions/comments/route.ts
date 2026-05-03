import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok, publicApiCacheHeaders, privateApiCacheHeaders } from '@/src/presentation/http/routeUtils';
import { nodeDiscussionCreateCommentSchema } from '@/src/presentation/schemas';
import {
  cachedPublicNodeDiscussion,
  invalidatePublicNodeDiscussionCache,
} from '@/shared/performance/nodeDiscussionCache';

function isAnonymousRequest(request: Request) {
  return !request.headers.get('cookie') && !request.headers.get('authorization');
}

export async function GET(
  request: Request,
  context: { params: Promise<{ nodeId: string }> }
) {
  try {
    const { nodeId } = await context.params;

    if (isAnonymousRequest(request)) {
      const payload = await cachedPublicNodeDiscussion(nodeId, async () => {
        const { nodeDiscussionQueryService } = await createServerContainer();
        const discussion = await nodeDiscussionQueryService.getNodeDiscussionView(null, nodeId);
        return { discussion };
      });

      return ok(payload, {
        headers: publicApiCacheHeaders({ sMaxAge: 30, staleWhileRevalidate: 120 }),
      });
    }

    const { authService, nodeDiscussionQueryService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext('dark');
    const discussion = await nodeDiscussionQueryService.getNodeDiscussionView(viewer, nodeId);
    return ok({ discussion }, { headers: privateApiCacheHeaders() });
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
    invalidatePublicNodeDiscussionCache(nodeId);
    return ok({ comment });
  } catch (error) {
    return failure(error);
  }
}
