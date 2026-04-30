'use client';

import { useMemo, useState } from 'react';

import { CatalogCourseCard } from '@/components/catalog/CatalogCourseCard';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';
import type { CatalogCourseSummary } from '@/src/domain/models';
import { cn } from '@/lib/utils';

type CourseFilterKey = 'free' | 'unlocked' | 'locked';

interface CourseGroup {
  key: CourseFilterKey;
  title: string;
  description: string;
  emptyState: string;
  courses: CatalogCourseSummary[];
}

const pageSizeOptions = [10, 50, 100] as const;

const courseGroupTemplate: Omit<CourseGroup, 'courses'>[] = [
  {
    key: 'free',
    title: 'Free courses',
    description: 'Open these immediately without a premium plan.',
    emptyState: 'No free courses available right now.',
  },
  {
    key: 'unlocked',
    title: 'Unlocked courses',
    description: 'Premium courses with active access for your account.',
    emptyState: 'No unlocked premium courses yet.',
  },
  {
    key: 'locked',
    title: 'Locked courses',
    description: 'Premium courses that need an active subscription.',
    emptyState: 'No locked premium courses found.',
  },
];

function groupCourses(courses: CatalogCourseSummary[]): CourseGroup[] {
  const groups: CourseGroup[] = courseGroupTemplate.map((group) => ({ ...group, courses: [] }));

  for (const course of courses) {
    const premium = describeCoursePremiumState(course, course.premiumNodeCount);
    if (premium.state === 'free') {
      groups[0].courses.push(course);
      continue;
    }

    if (course.access.viewerCanAccessPremium) {
      groups[1].courses.push(course);
    } else {
      groups[2].courses.push(course);
    }
  }

  return groups;
}

export function CatalogCourseSections(props: { courses: CatalogCourseSummary[]; className?: string }) {
  const groups = groupCourses(props.courses);
  const defaultActive = groups.find((group) => group.courses.length > 0)?.key ?? 'free';
  const [activeFilter, setActiveFilter] = useState<CourseFilterKey>(defaultActive);
  const [pageSize, setPageSize] = useState<(typeof pageSizeOptions)[number]>(10);
  const [page, setPage] = useState(1);
  const [domainFilter, setDomainFilter] = useState<string>('all');

  const activeGroup = groups.find((group) => group.key === activeFilter) ?? groups[0];
  const availableDomains = useMemo(() => {
    const map = new Map<string, string>();
    for (const course of props.courses) {
      if (course.domainSlug && course.domainName) {
        map.set(course.domainSlug, course.domainName);
      }
    }
    return Array.from(map.entries()).map(([slug, name]) => ({ slug, name }));
  }, [props.courses]);

  const filteredCourses = useMemo(() => {
    const base = activeGroup?.courses ?? [];
    if (domainFilter === 'all') {
      return base;
    }
    return base.filter((course) => course.domainSlug === domainFilter);
  }, [activeGroup, domainFilter]);

  const totalItems = filteredCourses.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIndex = (safePage - 1) * pageSize;
  const visibleCourses = filteredCourses.slice(startIndex, startIndex + pageSize);

  function handleChangeFilter(nextFilter: CourseFilterKey) {
    setActiveFilter(nextFilter);
    setPage(1);
  }

  function handleChangePageSize(nextSize: (typeof pageSizeOptions)[number]) {
    setPageSize(nextSize);
    setPage(1);
  }

  function handleDomainChange(nextDomain: string) {
    setDomainFilter(nextDomain);
    setPage(1);
  }

  return (
    <section className={cn('catalog-course-filter-shell', props.className)}>
      <div className="catalog-course-filter-bar" role="tablist" aria-label="Course access filters">
        {groups.map((group) => {
          const isActive = activeFilter === group.key;
          return (
            <button
              key={group.key}
              id={`catalog-filter-tab-${group.key}`}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`catalog-filter-panel-${group.key}`}
              className={cn('catalog-course-filter-button', isActive ? 'is-active' : undefined)}
              onClick={() => handleChangeFilter(group.key)}
            >
              <span>{group.title}</span>
              <span className="catalog-course-filter-count">{group.courses.length}</span>
            </button>
          );
        })}
      </div>

      <div
        id={`catalog-filter-panel-${activeGroup.key}`}
        role="tabpanel"
        aria-labelledby={`catalog-filter-tab-${activeGroup.key}`}
        className="catalog-course-filter-panel"
      >
        <header className="catalog-course-filter-header">
          <div>
            <h3 className="panel-title">{activeGroup.title}</h3>
            <p className="muted catalog-course-filter-subtitle">{activeGroup.description}</p>
          </div>
          <div className="catalog-course-controls">
            <div className="catalog-course-select-shell">
              <span className="muted">Domain</span>
              <select
                className="select catalog-course-inline-select"
                value={domainFilter}
                onChange={(event) => handleDomainChange(event.target.value)}
              >
                <option value="all">All domains</option>
                {availableDomains.map((domain) => (
                  <option key={domain.slug} value={domain.slug}>
                    {domain.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="catalog-course-size-group">
              <span className="muted">Show</span>
              <div className="inline premium-badge-row" style={{ gap: 8 }}>
                {pageSizeOptions.map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={cn('catalog-course-size-button', pageSize === option ? 'is-active' : undefined)}
                    onClick={() => handleChangePageSize(option)}
                  >
                    {option}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </header>

        {visibleCourses.length === 0 ? (
          <div className="empty-state catalog-course-section-empty">
            {domainFilter === 'all' ? activeGroup.emptyState : 'No courses match the selected domain filter.'}
          </div>
        ) : (
          <>
            <div className="studio-card-grid catalog-course-grid">
              {visibleCourses.map((course) => (
                <CatalogCourseCard key={course.id} course={course} />
              ))}
            </div>
            <div className="catalog-course-pager">
              <div className="muted">
                Showing {startIndex + 1}-{Math.min(startIndex + pageSize, totalItems)} of {totalItems} courses
              </div>
              <div className="inline" style={{ gap: 10 }}>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setPage((current) => Math.max(1, current - 1))}
                  disabled={safePage <= 1}
                >
                  Previous
                </button>
                <span className="tag">Page {safePage} of {totalPages}</span>
                <button
                  type="button"
                  className="button button-ghost"
                  onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                  disabled={safePage >= totalPages}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

