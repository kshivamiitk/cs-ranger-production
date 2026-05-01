import type { SearchParamsInput } from '@/lib/pagination';
import type { CatalogCourseSummary } from '@/src/domain/models';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';

export type CoursePricingFilter = 'all' | 'free' | 'premium';
export type CourseAccessFilter = 'all' | 'accessible' | 'locked';
export type CourseSortOption = 'newest' | 'best_rated' | 'most_popular';

export interface CourseCatalogFilters {
  domain: string;
  pricing: CoursePricingFilter;
  access: CourseAccessFilter;
  sort: CourseSortOption;
}

export interface CourseDomainFilterOption {
  slug: string;
  name: string;
  count: number;
}

export interface CourseCatalogFilterOptions {
  domains: CourseDomainFilterOption[];
  pricing: Record<CoursePricingFilter, number>;
  access: Record<CourseAccessFilter, number>;
  hasPopularityData: boolean;
}

type CourseCatalogHrefOverrides = Partial<{
  domain: string | null;
  pricing: CoursePricingFilter | null;
  access: CourseAccessFilter | null;
  sort: CourseSortOption | null;
  page: string | number | null;
  size: string | number | null;
}>;

const pricingFilters = new Set<CoursePricingFilter>(['all', 'free', 'premium']);
const accessFilters = new Set<CourseAccessFilter>(['all', 'accessible', 'locked']);
const sortOptions = new Set<CourseSortOption>(['newest', 'best_rated', 'most_popular']);

function scalar(input: string | string[] | undefined) {
  return Array.isArray(input) ? input[0] : input;
}

function dateValue(input: string | null | undefined) {
  if (!input) return 0;
  const parsed = Date.parse(input);
  return Number.isFinite(parsed) ? parsed : 0;
}

function isPremiumCourse(course: CatalogCourseSummary) {
  return describeCoursePremiumState(course, course.premiumNodeCount).state !== 'free';
}

function isCourseAccessible(course: CatalogCourseSummary) {
  return !isPremiumCourse(course) || course.access.viewerCanAccessPremium;
}

function normalizeDomain(input: string | undefined) {
  const value = input?.trim();
  return value ? value : 'all';
}

function normalizePricing(input: string | undefined): CoursePricingFilter {
  return pricingFilters.has(input as CoursePricingFilter) ? (input as CoursePricingFilter) : 'all';
}

function normalizeAccess(input: string | undefined): CourseAccessFilter {
  return accessFilters.has(input as CourseAccessFilter) ? (input as CourseAccessFilter) : 'all';
}

function normalizeSort(input: string | undefined): CourseSortOption {
  return sortOptions.has(input as CourseSortOption) ? (input as CourseSortOption) : 'newest';
}

function sortNewest(left: CatalogCourseSummary, right: CatalogCourseSummary) {
  return dateValue(right.createdAt ?? right.updatedAt) - dateValue(left.createdAt ?? left.updatedAt);
}

export function parseCourseCatalogFilters(searchParams: SearchParamsInput): CourseCatalogFilters {
  return {
    domain: normalizeDomain(scalar(searchParams?.domain)),
    pricing: normalizePricing(scalar(searchParams?.pricing)),
    access: normalizeAccess(scalar(searchParams?.access)),
    sort: normalizeSort(scalar(searchParams?.sort)),
  };
}

export function getCourseCatalogFilterOptions(courses: CatalogCourseSummary[]): CourseCatalogFilterOptions {
  const domainMap = new Map<string, CourseDomainFilterOption>();
  const pricing: Record<CoursePricingFilter, number> = { all: courses.length, free: 0, premium: 0 };
  const access: Record<CourseAccessFilter, number> = { all: courses.length, accessible: 0, locked: 0 };
  let hasPopularityData = false;

  for (const course of courses) {
    if (course.domainSlug && course.domainName) {
      const existing = domainMap.get(course.domainSlug);
      domainMap.set(course.domainSlug, {
        slug: course.domainSlug,
        name: existing?.name ?? course.domainName,
        count: (existing?.count ?? 0) + 1,
      });
    }

    if (isPremiumCourse(course)) {
      pricing.premium += 1;
    } else {
      pricing.free += 1;
    }

    if (isCourseAccessible(course)) {
      access.accessible += 1;
    } else {
      access.locked += 1;
    }

    if (course.engagement.activeLearnerCount > 0) {
      hasPopularityData = true;
    }
  }

  return {
    domains: Array.from(domainMap.values()).sort((left, right) => left.name.localeCompare(right.name)),
    pricing,
    access,
    hasPopularityData,
  };
}

export function filterAndSortCatalogCourses(
  courses: CatalogCourseSummary[],
  filters: CourseCatalogFilters
): CatalogCourseSummary[] {
  const filtered = courses.filter((course) => {
    if (filters.domain !== 'all' && course.domainSlug !== filters.domain) {
      return false;
    }

    const premium = isPremiumCourse(course);
    if (filters.pricing === 'free' && premium) {
      return false;
    }
    if (filters.pricing === 'premium' && !premium) {
      return false;
    }

    const accessible = isCourseAccessible(course);
    if (filters.access === 'accessible' && !accessible) {
      return false;
    }
    if (filters.access === 'locked' && accessible) {
      return false;
    }

    return true;
  });

  const hasPopularityData = filtered.some((course) => course.engagement.activeLearnerCount > 0);
  return [...filtered].sort((left, right) => {
    if (filters.sort === 'best_rated') {
      const ratingDelta = right.engagement.averageRating - left.engagement.averageRating;
      if (ratingDelta !== 0) return ratingDelta;
      const reviewDelta = right.engagement.totalReviews - left.engagement.totalReviews;
      if (reviewDelta !== 0) return reviewDelta;
      return sortNewest(left, right);
    }

    if (filters.sort === 'most_popular' && hasPopularityData) {
      const learnerDelta = right.engagement.activeLearnerCount - left.engagement.activeLearnerCount;
      if (learnerDelta !== 0) return learnerDelta;
      return sortNewest(left, right);
    }

    return sortNewest(left, right);
  });
}

export function hasActiveCourseCatalogFilters(filters: CourseCatalogFilters) {
  return filters.domain !== 'all' || filters.pricing !== 'all' || filters.access !== 'all' || filters.sort !== 'newest';
}

export function createCourseCatalogFilterHref(
  pathname: string,
  searchParams: SearchParamsInput,
  overrides: CourseCatalogHrefOverrides
) {
  const params = new URLSearchParams();
  const source = searchParams ?? {};

  for (const [key, value] of Object.entries(source)) {
    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry) params.append(key, entry);
      }
    } else if (value) {
      params.set(key, value);
    }
  }

  const resetPage = !Object.prototype.hasOwnProperty.call(overrides, 'page');
  if (resetPage) {
    params.set('page', '1');
  }

  for (const [key, value] of Object.entries(overrides)) {
    if (value === null || value === undefined || value === '' || value === 'all' || (key === 'sort' && value === 'newest')) {
      params.delete(key);
      continue;
    }
    params.set(key, String(value));
  }

  if (params.get('page') === '1' && !Object.prototype.hasOwnProperty.call(overrides, 'page')) {
    params.delete('page');
  }

  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
