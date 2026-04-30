import type { CourseReviewViewItem } from '@/src/domain/models';
import { CourseReviewItem } from '@/components/reviews/CourseReviewItem';

export function CourseReviewList(props: { reviews: CourseReviewViewItem[] }) {
  if (props.reviews.length === 0) {
    return <div className="empty-state">No reviews yet.</div>;
  }

  return (
    <div className="stack course-review-list">
      {props.reviews.map((review) => (
        <CourseReviewItem key={review.id} review={review} />
      ))}
    </div>
  );
}


