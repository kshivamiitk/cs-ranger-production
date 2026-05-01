import { BookOpen } from 'lucide-react';

import { CatalogCourseCard } from '@/components/catalog/CatalogCourseCard';
import { CourseFilterChips } from '@/components/catalog/CourseFilterChips';
import { CourseFilterSidebar } from '@/components/catalog/CourseFilterSidebar';
import {
  filterAndSortCatalogCourses,
  parseCourseCatalogFilters,
  type CourseCatalogFilters,
} from '@/components/catalog/courseCatalogFilters';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination, type SearchParamsInput } from '@/lib/pagination';
import type { CatalogCourseSummary } from '@/src/domain/models';
import { cn } from '@/lib/utils';

type Props = {
  courses: CatalogCourseSummary[];
  className?: string;
  pathname?: string;
  searchParams?: SearchParamsInput;
  viewerIsLoggedIn?: boolean;
  title?: string;
  description?: string;
  emptyState?: string;
};

function effectiveFilters(searchParams: SearchParamsInput, viewerIsLoggedIn: boolean): CourseCatalogFilters {
  const filters = parseCourseCatalogFilters(searchParams);
  return viewerIsLoggedIn ? filters : { ...filters, access: 'all' };
}

export function CatalogCourseSections(props: Props) {
  const pathname = props.pathname ?? '/courses';
  const viewerIsLoggedIn = Boolean(props.viewerIsLoggedIn);
  const filters = effectiveFilters(props.searchParams, viewerIsLoggedIn);
  const filteredCourses = filterAndSortCatalogCourses(props.courses, filters);
  const pagination = resolveListPagination(props.searchParams, { size: 10 });
  const paged = paginateList(filteredCourses, pagination.page, pagination.size);
  const resultLabel = filteredCourses.length === 1 ? 'course' : 'courses';

  return (
    <section className={cn('course-discovery-shell', props.className)}>
      <CourseFilterSidebar
        courses={props.courses}
        filters={filters}
        pathname={pathname}
        searchParams={props.searchParams}
        viewerIsLoggedIn={viewerIsLoggedIn}
      />

      <div className="course-discovery-results">
        <header className="course-discovery-header">
          <div>
            <span className="course-discovery-eyebrow">
              <BookOpen size={14} />
              Course catalog
            </span>
            <h2>{props.title ?? 'Explore courses'}</h2>
            <p>{props.description ?? 'Filter by domain, pricing, access, and course signals without reloading data.'}</p>
          </div>
          <div className="course-discovery-count">
            <strong>{filteredCourses.length}</strong>
            <span>{resultLabel}</span>
          </div>
        </header>

        <CourseFilterChips
          courses={props.courses}
          filters={filters}
          pathname={pathname}
          searchParams={props.searchParams}
          viewerIsLoggedIn={viewerIsLoggedIn}
        />

        {paged.items.length === 0 ? (
          <div className="empty-state course-discovery-empty">
            {props.emptyState ?? 'No courses match the selected filters. Clear filters or choose a broader option.'}
          </div>
        ) : (
          <>
            <div className="studio-card-grid catalog-course-grid course-discovery-grid">
              {paged.items.map((course) => (
                <CatalogCourseCard key={course.id} course={course} />
              ))}
            </div>

            <ListPaginationControls
              pathname={pathname}
              searchParams={props.searchParams}
              page={paged.page}
              size={paged.size}
              totalItems={paged.totalItems}
              totalPages={paged.totalPages}
              startIndex={paged.startIndex}
              endIndex={paged.endIndex}
              noun={resultLabel}
            />
          </>
        )}
      </div>
    </section>
  );
}
