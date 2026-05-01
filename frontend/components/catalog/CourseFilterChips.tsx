import Link from 'next/link';
import { X } from 'lucide-react';

import {
  createCourseCatalogFilterHref,
  getCourseCatalogFilterOptions,
  hasActiveCourseCatalogFilters,
  type CourseCatalogFilters,
} from '@/components/catalog/courseCatalogFilters';
import type { SearchParamsInput } from '@/lib/pagination';
import type { CatalogCourseSummary } from '@/src/domain/models';

type Props = {
  courses: CatalogCourseSummary[];
  filters: CourseCatalogFilters;
  pathname: string;
  searchParams?: SearchParamsInput;
  viewerIsLoggedIn?: boolean;
};

function pricingLabel(value: CourseCatalogFilters['pricing']) {
  if (value === 'free') return 'Free';
  if (value === 'premium') return 'Paid / Premium';
  return 'All';
}

function accessLabel(value: CourseCatalogFilters['access']) {
  if (value === 'accessible') return 'Accessible';
  if (value === 'locked') return 'Locked';
  return 'All';
}

function sortLabel(value: CourseCatalogFilters['sort']) {
  if (value === 'best_rated') return 'Best rated';
  if (value === 'most_popular') return 'Most popular';
  return 'Newest';
}

export function CourseFilterChips(props: Props) {
  if (!hasActiveCourseCatalogFilters(props.filters)) {
    return null;
  }

  const options = getCourseCatalogFilterOptions(props.courses);
  const activeDomain = options.domains.find((domain) => domain.slug === props.filters.domain);
  const chips: Array<{ key: string; label: string; href: string }> = [];

  if (props.filters.domain !== 'all') {
    chips.push({
      key: 'domain',
      label: `Domain: ${activeDomain?.name ?? props.filters.domain}`,
      href: createCourseCatalogFilterHref(props.pathname, props.searchParams, { domain: null }),
    });
  }

  if (props.filters.pricing !== 'all') {
    chips.push({
      key: 'pricing',
      label: `Pricing: ${pricingLabel(props.filters.pricing)}`,
      href: createCourseCatalogFilterHref(props.pathname, props.searchParams, { pricing: null }),
    });
  }

  if (props.viewerIsLoggedIn && props.filters.access !== 'all') {
    chips.push({
      key: 'access',
      label: `Access: ${accessLabel(props.filters.access)}`,
      href: createCourseCatalogFilterHref(props.pathname, props.searchParams, { access: null }),
    });
  }

  if (props.filters.sort !== 'newest') {
    chips.push({
      key: 'sort',
      label: `Sort: ${sortLabel(props.filters.sort)}`,
      href: createCourseCatalogFilterHref(props.pathname, props.searchParams, { sort: null }),
    });
  }

  if (chips.length === 0) {
    return null;
  }

  return (
    <div className="course-filter-chip-row" aria-label="Active course filters">
      {chips.map((chip) => (
        <Link key={chip.key} href={chip.href} className="course-filter-chip">
          {chip.label}
          <X size={13} />
        </Link>
      ))}
      <Link
        href={createCourseCatalogFilterHref(props.pathname, props.searchParams, {
          domain: null,
          pricing: null,
          access: null,
          sort: null,
        })}
        className="course-filter-chip course-filter-chip-clear"
      >
        Clear filters
      </Link>
    </div>
  );
}
