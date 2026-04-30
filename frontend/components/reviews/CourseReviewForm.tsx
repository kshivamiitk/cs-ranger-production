'use client';

import { useEffect, useState } from 'react';

import type { CourseReview } from '@/src/domain/models';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { StarRatingInput } from '@/components/reviews/StarRatingInput';

export function CourseReviewForm(props: {
  initialReview: CourseReview | null;
  pending?: boolean;
  disabled?: boolean;
  onSubmit: (input: { rating: number; reviewText: string | null }) => Promise<void> | void;
  onDelete?: () => Promise<void> | void;
}) {
  const [rating, setRating] = useState(props.initialReview?.rating ?? 5);
  const [reviewText, setReviewText] = useState(props.initialReview?.reviewText ?? '');

  useEffect(() => {
    setRating(props.initialReview?.rating ?? 5);
    setReviewText(props.initialReview?.reviewText ?? '');
  }, [props.initialReview]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (props.disabled || props.pending) {
      return;
    }

    await props.onSubmit({
      rating,
      reviewText: reviewText.trim().length > 0 ? reviewText.trim() : null,
    });
  }

  return (
    <form className="panel stack course-review-form" onSubmit={handleSubmit}>
      <div className="stack" style={{ gap: 10 }}>
        <h3 className="panel-title" style={{ margin: 0 }}>
          {props.initialReview ? 'Update your review' : 'Add your review'}
        </h3>
        <StarRatingInput value={rating} onChange={setRating} disabled={props.disabled || props.pending} />
      </div>

      <label className="field">
        <span className="field-label">Review</span>
        <TextArea
          rows={4}
          value={reviewText}
          disabled={props.disabled || props.pending}
          onChange={(event) => setReviewText(event.target.value)}
          placeholder="Share what worked well and where the course can improve."
        />
      </label>

      <div className="inline">
        <Button type="submit" disabled={props.disabled || props.pending}>
          {props.pending ? 'Saving...' : props.initialReview ? 'Update review' : 'Submit review'}
        </Button>
        {props.initialReview && props.onDelete ? (
          <Button
            type="button"
            variant="danger"
            disabled={props.disabled || props.pending}
            onClick={() => void props.onDelete?.()}
          >
            Delete review
          </Button>
        ) : null}
      </div>
    </form>
  );
}


