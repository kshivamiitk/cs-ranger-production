import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { cachedValue } from '@/shared/performance/apiCache';
import { learnerCreatorCacheKey, learnerCreatorCacheTtlMs } from '@/src/performance/learnerCreatorCache';

export async function GET() {
  try {
    const { authService, courseCollaborationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const cacheKey = learnerCreatorCacheKey(['creator', viewer.user.id, 'incoming-invites']);
    const payload = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.incomingInvites, async () => ({
      invites: await courseCollaborationService.listIncomingInvites(viewer),
    }));
    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}
