import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { cachedValue } from '@/shared/performance/apiCache';
import {
  invalidateLearnerCreatorReadCaches,
  learnerCreatorCacheKey,
  learnerCreatorCacheTtlMs,
} from '@/src/performance/learnerCreatorCache';

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await context.params;
    const { authService, courseCollaborationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const cacheKey = learnerCreatorCacheKey(['creator-collaboration', viewer.user.id, courseId]);
    const workspace = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.creatorCollaboration, async () =>
      courseCollaborationService.listCourseWorkspace(viewer, courseId)
    );
    return ok(workspace);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> },
) {
  try {
    const { courseId } = await context.params;
    const body = await request.json();
    const username = typeof body?.username === 'string' ? body.username.trim().toLowerCase() : '';
    const message = typeof body?.message === 'string' ? body.message.trim() : null;
    const { authService, courseCollaborationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const invite = await courseCollaborationService.inviteCollaborator(viewer, { courseId, username, message });
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });
    return ok({ invite });
  } catch (error) {
    return failure(error);
  }
}
