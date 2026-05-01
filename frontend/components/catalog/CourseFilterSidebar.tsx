import Link from 'next/link';
import { Check, ChevronDown, SlidersHorizontal, X } from 'lucide-react';

import {
  createCourseCatalogFilterHref,
  getCourseCatalogFilterOptions,
  type CourseAccessFilter,
  type CourseCatalogFilters,
  type CoursePricingFilter,
  type CourseSortOption,
} from '@/components/catalog/courseCatalogFilters';
import type { SearchParamsInput } from '@/lib/pagination';
import type { CatalogCourseSummary } from '@/src/domain/models';
import { cn } from '@/lib/utils';

type Props = {
  courses: CatalogCourseSummary[];
  filters: CourseCatalogFilters;
  pathname: string;
  searchParams?: SearchParamsInput;
  viewerIsLoggedIn?: boolean;
};

type FilterOption<Value extends string> = {
  value: Value;
  label: string;
  count?: number;
  helper?: string;
};

const pricingOptions: Array<FilterOption<CoursePricingFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'free', label: 'Free' },
  { value: 'premium', label: 'Paid / Premium' },
];

const accessOptions: Array<FilterOption<CourseAccessFilter>> = [
  { value: 'all', label: 'All' },
  { value: 'accessible', label: 'Accessible' },
  { value: 'locked', label: 'Locked' },
];

function sortOptions(hasPopularityData: boolean): Array<FilterOption<CourseSortOption>> {
  return [
    { value: 'newest', label: 'Newest' },
    { value: 'best_rated', label: 'Best rated' },
    {
      value: 'most_popular',
      label: 'Most popular',
      helper: hasPopularityData ? undefined : 'Uses newest until learner data exists',
    },
  ];
}

function FilterSection<Value extends string>(props: {
  title: string;
  options: Array<FilterOption<Value>>;
  activeValue: Value;
  hrefForValue: (value: Value) => string;
}) {
  return (
    <section className="course-filter-section" aria-label={props.title}>
      <h3>{props.title}</h3>
      <div className="course-filter-option-list">
        {props.options.map((option) => {
          const isActive = option.value === props.activeValue;
          return (
            <Link
              key={option.value}
              href={props.hrefForValue(option.value)}
              className={cn('course-filter-option', isActive ? 'is-active' : undefined)}
              aria-current={isActive ? 'true' : undefined}
            >
              <span className="course-filter-radio" aria-hidden="true">
                {isActive ? <Check size={12} /> : null}
              </span>
              <span className="course-filter-option-copy">
                <span>{option.label}</span>
                {option.helper ? <small>{option.helper}</small> : null}
              </span>
              {typeof option.count === 'number' ? <span className="course-filter-count">{option.count}</span> : null}
            </Link>
          );
        })}
      </div>
    </section>
  );
}

function SidebarContent(props: Props) {
  const options = getCourseCatalogFilterOptions(props.courses);
  const domainOptions: Array<FilterOption<string>> = [
    { value: 'all', label: 'All domains', count: props.courses.length },
    ...options.domains.map((domain) => ({ value: domain.slug, label: domain.name, count: domain.count })),
  ];
  const clearHref = createCourseCatalogFilterHref(props.pathname, props.searchParams, {
    domain: null,
    pricing: null,
    access: null,
    sort: null,
  });

  return (
    <div className="course-filter-card">
      <div className="course-filter-card-header">
        <div>
          <span>Course filters</span>
          <p>Refine the catalog instantly.</p>
        </div>
        <Link href={clearHref} className="course-filter-clear">
          <X size={14} />
          Clear
        </Link>
      </div>

      <FilterSection
        title="Course Domain"
        options={domainOptions}
        activeValue={props.filters.domain}
        hrefForValue={(domain) => createCourseCatalogFilterHref(props.pathname, props.searchParams, { domain })}
      />

      <FilterSection
        title="Pricing"
        options={pricingOptions.map((option) => ({ ...option, count: options.pricing[option.value] }))}
        activeValue={props.filters.pricing}
        hrefForValue={(pricing) => createCourseCatalogFilterHref(props.pathname, props.searchParams, { pricing })}
      />

      {props.viewerIsLoggedIn ? (
        <FilterSection
          title="Access status"
          options={accessOptions.map((option) => ({ ...option, count: options.access[option.value] }))}
          activeValue={props.filters.access}
          hrefForValue={(access) => createCourseCatalogFilterHref(props.pathname, props.searchParams, { access })}
        />
      ) : null}

      <FilterSection
        title="Sort"
        options={sortOptions(options.hasPopularityData)}
        activeValue={props.filters.sort}
        hrefForValue={(sort) => createCourseCatalogFilterHref(props.pathname, props.searchParams, { sort })}
      />
    </div>
  );
}

export function CourseFilterSidebar(props: Props) {
  return (
    <>
      <aside className="course-filter-sidebar" aria-label="Course filters">
        <SidebarContent {...props} />
      </aside>

      <details className="course-filter-mobile-drawer">
        <summary>
          <span>
            <SlidersHorizontal size={16} />
            Filters
          </span>
          <ChevronDown size={16} />
        </summary>
        <SidebarContent {...props} />
      </details>
    </>
  );
}
