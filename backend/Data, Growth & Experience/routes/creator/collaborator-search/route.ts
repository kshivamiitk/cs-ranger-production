import { createServerContainer } from '@/src/infrastructure/container/server';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { failure, ok } from '@/src/presentation/http/routeUtils';

export async function GET(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'search');
    if (rateLimited) return rateLimited;

    const url = new URL(request.url);
    const query = (url.searchParams.get('q') ?? '').trim();
    const { authService, courseCollaborationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireCreator();
    const creators = query ? await courseCollaborationService.searchCreatorsByUsername(viewer, query) : [];
    return ok({ creators });
  } catch (error) {
    return failure(error, request);
  }
}

