'use client';

import { useState, useTransition } from 'react';

import type { CourseReviewsView } from '@/src/domain/models';
import { apiJson } from '@/src/presentation/http/client';
import { CourseReviewSummaryCard } from '@/components/reviews/CourseReviewSummaryCard';
import { CourseReviewForm } from '@/components/reviews/CourseReviewForm';
import { CourseReviewList } from '@/components/reviews/CourseReviewList';

export function CourseReviewsSection(props: {
  courseId: string;
  initialView: CourseReviewsView;
}) {
  const [view, setView] = useState(props.initialView);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function refreshReviews() {
    return apiJson<{ reviews: CourseReviewsView }>(`/api/courses/${props.courseId}/reviews`).then((response) => {
      setView(response.reviews);
    });
  }

  function runAction(action: () => Promise<void>) {
    setError(null);
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        try {
          await action();
          await refreshReviews();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Course review update failed.');
        } finally {
          resolve();
        }
      });
    });
  }

  return (
    <section className="stack course-reviews-section">
      <CourseReviewSummaryCard summary={view.summary} />

      {view.canReview ? (
        <CourseReviewForm
          initialReview={view.ownReview}
          pending={pending}
          disabled={pending}
          onSubmit={(input) =>
            runAction(async () => {
              await apiJson(`/api/courses/${props.courseId}/reviews/me`, {
                method: 'PUT',
                body: JSON.stringify(input),
              });
            })
          }
          onDelete={
            view.ownReview
              ? () =>
                  runAction(async () => {
                    await apiJson(`/api/courses/reviews/${view.ownReview?.id}`, {
                      method: 'DELETE',
                    });
                  })
              : undefined
          }
        />
      ) : (
        <div className="panel">
          <p className="muted" style={{ margin: 0 }}>
            {view.canReviewReason ?? 'Reviews are currently unavailable.'}
          </p>
        </div>
      )}

      {error ? <div className="studio-inline-alert">{error}</div> : null}

      <section className="panel stack">
        <h3 className="panel-title" style={{ margin: 0 }}>Course reviews</h3>
        <CourseReviewList reviews={view.reviews} />
      </section>
    </section>
  );
}


