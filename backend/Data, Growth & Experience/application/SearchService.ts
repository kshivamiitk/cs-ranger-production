import { CatalogCourseSummaryQueryService } from '@/src/application/CatalogCourseSummaryQueryService';
import type { CatalogCourseQuery, Viewer } from '@/src/domain/models';
import type { CourseRepository, SearchRepository } from '@/src/domain/ports';

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
    return this.searchRepository.listTopCreators({
      viewerUserId: viewer?.user.id ?? null,
      limit,
    });
  }
}


