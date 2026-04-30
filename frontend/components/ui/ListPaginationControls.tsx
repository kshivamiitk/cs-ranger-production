import Link from 'next/link';

import type { SearchParamsInput } from '@/lib/pagination';
import { listPageSizeOptions } from '@/lib/pagination';

type Props = {
  pathname: string;
  searchParams?: SearchParamsInput;
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  noun?: string;
};

function buildHref(pathname: string, searchParams: SearchParamsInput, overrides: Record<string, string>) {
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
  for (const [key, value] of Object.entries(overrides)) {
    params.set(key, value);
  }
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}

export function ListPaginationControls(props: Props) {
  const noun = props.noun ?? 'items';

  if (props.totalItems <= 0) {
    return null;
  }

  return (
    <div className="list-pagination-shell">
      <div className="list-pagination-summary">
        Showing {props.startIndex + 1}-{props.endIndex} of {props.totalItems} {noun}
      </div>
      <div className="list-pagination-actions">
        <div className="list-page-size-group">
          <span className="muted">Show</span>
          <div className="inline premium-badge-row" style={{ gap: 8 }}>
            {listPageSizeOptions.map((option) => (
              <Link
                key={option}
                href={buildHref(props.pathname, props.searchParams, { size: String(option), page: '1' })}
                className={`list-page-size-link${props.size === option ? ' is-active' : ''}`}
              >
                {option}
              </Link>
            ))}
          </div>
        </div>
        <div className="list-page-nav">
          <Link
            href={buildHref(props.pathname, props.searchParams, { page: String(Math.max(1, props.page - 1)), size: String(props.size) })}
            className={`button button-ghost${props.page <= 1 ? ' is-disabled' : ''}`}
            aria-disabled={props.page <= 1}
            tabIndex={props.page <= 1 ? -1 : undefined}
          >
            Previous
          </Link>
          <span className="tag">Page {props.page} of {props.totalPages}</span>
          <Link
            href={buildHref(props.pathname, props.searchParams, { page: String(Math.min(props.totalPages, props.page + 1)), size: String(props.size) })}
            className={`button button-ghost${props.page >= props.totalPages ? ' is-disabled' : ''}`}
            aria-disabled={props.page >= props.totalPages}
            tabIndex={props.page >= props.totalPages ? -1 : undefined}
          >
            Next
          </Link>
        </div>
      </div>
    </div>
  );
}


