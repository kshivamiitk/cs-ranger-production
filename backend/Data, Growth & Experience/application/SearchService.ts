import { CatalogCourseSummaryQueryService } from '@/src/application/CatalogCourseSummaryQueryService';
import type { CatalogCourseQuery, Viewer } from '@/src/domain/models';
import type { CourseRepository, SearchRepository } from '@/src/domain/ports';
import { cachedValue, stableCacheKey } from '@/shared/performance/apiCache';

const searchCacheTtlMs = {
  guestEverything: Number(process.env.SEARCH_GUEST_CACHE_MS ?? 60_000),
  signedEverything: Number(process.env.SEARCH_SIGNED_CACHE_MS ?? 15_000),
  topCreatorsGuest: Number(process.env.SEARCH_TOP_CREATORS_GUEST_CACHE_MS ?? 120_000),
  topCreatorsSigned: Number(process.env.SEARCH_TOP_CREATORS_SIGNED_CACHE_MS ?? 20_000),
};

export class SearchService {
  constructor(
    private readonly searchRepository: SearchRepository,
    private readonly courseRepository: CourseRepository,
    private readonly catalogCourseSummaryQueryService: CatalogCourseSummaryQueryService
  ) {}

  async searchEverything(
    query: string,
    viewer: Viewer | null,
    options?: Omit<CatalogCourseQuery, 'query'>
  ) {
    const normalizedQuery = query.trim();
    if (!normalizedQuery) {
      return {
        query: '',
        queryOptions: {
          premiumFilter: options?.premiumFilter ?? 'all',
          minRating: options?.minRating ?? null,
          sort: options?.sort ?? 'newest',
        },
        courses: [],
        modules: [],
        nodes: [],
        creators: [],
      };
    }

    const cacheKey = stableCacheKey([
      'search',
      'everything',
      viewer?.user.id ?? 'guest',
      normalizedQuery.toLowerCase(),
      options?.premiumFilter ?? 'all',
      options?.minRating ?? 'none',
      options?.sort ?? 'newest',
    ]);

    return cachedValue(
      cacheKey,
      viewer ? searchCacheTtlMs.signedEverything : searchCacheTtlMs.guestEverything,
      () => this.searchEverythingUncached(normalizedQuery, viewer, options)
    );
  }

  private async searchEverythingUncached(
    normalizedQuery: string,
    viewer: Viewer | null,
    options?: Omit<CatalogCourseQuery, 'query'>
  ) {
    const [courseResults, results] = await Promise.all([
      this.courseRepository.listPublishedCourses({
        query: normalizedQuery,
        premiumFilter: options?.premiumFilter,
        minRating: options?.minRating,
        sort: options?.sort,
      }),
      this.searchRepository.searchEverything({
        query: normalizedQuery,
        viewerUserId: viewer?.user.id ?? null,
      }),
    ]);
    const courses = await this.catalogCourseSummaryQueryService.buildSummaries(viewer, courseResults);

    return {
      query: normalizedQuery,
      queryOptions: {
        premiumFilter: options?.premiumFilter ?? 'all',
        minRating: options?.minRating ?? null,
        sort: options?.sort ?? 'newest',
      },
      courses,
      modules: results.modules,
      nodes: results.nodes,
      creators: results.creators,
    };
  }

  async listTopCreators(viewer: Viewer | null, limit = 6) {
    const normalizedLimit = Math.max(1, Math.min(limit, 12));
    const cacheKey = stableCacheKey([
      'search',
      'top-creators',
      viewer?.user.id ?? 'guest',
      normalizedLimit,
    ]);

    return cachedValue(
      cacheKey,
      viewer ? searchCacheTtlMs.topCreatorsSigned : searchCacheTtlMs.topCreatorsGuest,
      () => this.searchRepository.listTopCreators({
        viewerUserId: viewer?.user.id ?? null,
        limit: normalizedLimit,
      })
    );
  }
}

