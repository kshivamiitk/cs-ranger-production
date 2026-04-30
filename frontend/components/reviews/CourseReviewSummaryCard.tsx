import type { CourseReviewSummary } from '@/src/domain/models';
import { StarRatingDisplay } from '@/components/reviews/StarRatingDisplay';

export function CourseReviewSummaryCard(props: { summary: CourseReviewSummary }) {
  return (
    <article className="card course-review-summary-card">
      <div className="panel-header">
        <div className="stack" style={{ gap: 8 }}>
          <h3 className="panel-title" style={{ margin: 0 }}>Course rating</h3>
          <div className="inline premium-badge-row">
            <StarRatingDisplay rating={props.summary.averageRating} />
            <strong>{props.summary.averageRating.toFixed(2)}</strong>
            <span className="muted">({props.summary.totalReviews} review{props.summary.totalReviews === 1 ? '' : 's'})</span>
          </div>
        </div>
      </div>
    </article>
  );
}


