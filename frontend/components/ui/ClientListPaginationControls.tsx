'use client';

import { listPageSizeOptions } from '@/lib/pagination';

type Props = {
  page: number;
  size: number;
  totalItems: number;
  totalPages: number;
  startIndex: number;
  endIndex: number;
  noun?: string;
  onPageChange: (page: number) => void;
  onSizeChange: (size: number) => void;
};

export function ClientListPaginationControls(props: Props) {
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
              <button
                key={option}
                type="button"
                onClick={() => props.onSizeChange(option)}
                className={`list-page-size-link${props.size === option ? ' is-active' : ''}`}
              >
                {option}
              </button>
            ))}
          </div>
        </div>
        <div className="list-page-nav">
          <button
            type="button"
            onClick={() => props.onPageChange(Math.max(1, props.page - 1))}
            className={`button button-ghost${props.page <= 1 ? ' is-disabled' : ''}`}
            disabled={props.page <= 1}
          >
            Previous
          </button>
          <span className="tag">Page {props.page} of {props.totalPages}</span>
          <button
            type="button"
            onClick={() => props.onPageChange(Math.min(props.totalPages, props.page + 1))}
            className={`button button-ghost${props.page >= props.totalPages ? ' is-disabled' : ''}`}
            disabled={props.page >= props.totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}


