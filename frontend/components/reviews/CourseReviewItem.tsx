import type { CourseReviewViewItem } from '@/src/domain/models';
import { StarRatingDisplay } from '@/components/reviews/StarRatingDisplay';

export function CourseReviewItem(props: { review: CourseReviewViewItem }) {
  return (
    <article className="card course-review-item">
      <div className="panel-header">
        <div className="stack" style={{ gap: 8 }}>
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-muted">
              {props.review.reviewer?.fullName ?? props.review.reviewerUserId}
            </span>
            {props.review.isEdited ? <span className="studio-badge studio-badge-muted">Edited</span> : null}
          </div>
          <StarRatingDisplay rating={props.review.rating} />
          <p className="muted" style={{ margin: 0 }}>
            {props.review.reviewText ?? 'No written feedback provided.'}
          </p>
        </div>
      </div>
    </article>
  );
}


