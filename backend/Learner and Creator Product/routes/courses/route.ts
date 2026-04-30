import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { defaultTheme } from '@/lib/constants';
import { cachedValue } from '@/shared/performance/apiCache';
import { learnerCreatorCacheKey, learnerCreatorCacheTtlMs } from '@/src/performance/learnerCreatorCache';

function parseCourseQuery(request: Request) {
  const url = new URL(request.url);
  const premiumFilter = url.searchParams.get('premiumFilter');
  const sort = url.searchParams.get('sort');
  const minRating = url.searchParams.get('minRating');

  return {
    query: url.searchParams.get('query') || null,
    domainSlug: url.searchParams.get('domainSlug') || null,
    premiumFilter: premiumFilter === 'free' || premiumFilter === 'premium' ? premiumFilter : 'all',
    sort: sort === 'most_popular' || sort === 'best_rated' ? sort : 'newest',
    minRating: minRating ? Number(minRating) : null,
  } as const;
}

export async function GET(request: Request) {
  try {
    const input = parseCourseQuery(request);
    const { authService, catalogService } = await createServerContainer({ writeCookies: true });
    const { viewer } = await authService.getViewerContext(defaultTheme);
    const cacheKey = learnerCreatorCacheKey([
      'courses',
      'list',
      viewer?.user.id ?? 'guest',
      input.query,
      input.domainSlug,
      input.premiumFilter,
      input.sort,
      input.minRating,
    ]);
    const payload = await cachedValue(
      cacheKey,
      viewer ? learnerCreatorCacheTtlMs.signedCourseList : learnerCreatorCacheTtlMs.publicCourseList,
      async () => ({ courses: await catalogService.listPublishedCourses(viewer, input) })
    );
    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}
