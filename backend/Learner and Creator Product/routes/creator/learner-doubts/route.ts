import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';
import { cachedValue } from '@/shared/performance/apiCache';
import { learnerCreatorCacheKey } from '@/src/performance/learnerCreatorCache';

const learnerDoubtsCacheMs = Number(process.env.LCP_CREATOR_DOUBTS_CACHE_MS ?? 15_000);

export async function GET() {
  try {
    const { authService, creatorLearnerDoubtQueryService } = await createServerContainer({
      writeCookies: true,
    });
    const viewer = await authService.requireCreator();
    const cacheKey = learnerCreatorCacheKey(['creator', viewer.user.id, 'learner-doubts']);
    const payload = await cachedValue(cacheKey, learnerDoubtsCacheMs, async () => ({
      doubts: await creatorLearnerDoubtQueryService.listCreatorLearnerDoubts(viewer),
    }));
    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}
