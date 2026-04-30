'use client';

import { useEffect, useState, useTransition } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

import { cn } from '@/lib/utils';
import { apiJson } from '@/src/presentation/http/client';

export function NodeBookmarkButton(props: {
  courseId: string;
  nodeId: string;
  initialBookmarked: boolean;
  enabled: boolean;
  className?: string;
  onBookmarkedChange?: (bookmarked: boolean) => void;
}) {
  const [bookmarked, setBookmarked] = useState(props.initialBookmarked);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  useEffect(() => {
    setBookmarked(props.initialBookmarked);
  }, [props.initialBookmarked]);

  return (
    <div className={cn('node-bookmark-control', props.className)}>
      <button
        type="button"
        className={cn(
          'button button-secondary node-bookmark-button',
          bookmarked ? 'is-active' : undefined
        )}
        disabled={!props.enabled || pending}
        aria-pressed={bookmarked}
        aria-label={bookmarked ? 'Remove bookmark' : 'Bookmark this node'}
        title={!props.enabled ? 'Bookmarking is unavailable right now.' : undefined}
        onClick={() => {
          if (!props.enabled) {
            return;
          }

          startTransition(async () => {
            const nextBookmarked = !bookmarked;
            setErrorMessage(null);

            try {
              await apiJson(`/api/courses/${props.courseId}/nodes/${props.nodeId}/bookmark`, {
                method: nextBookmarked ? 'POST' : 'DELETE',
              });
              setBookmarked(nextBookmarked);
              props.onBookmarkedChange?.(nextBookmarked);
            } catch (error) {
              setErrorMessage(error instanceof Error ? error.message : 'Could not update bookmark.');
            }
          });
        }}
      >
        {bookmarked ? <BookmarkCheck size={16} /> : <Bookmark size={16} />}
        {bookmarked ? 'Bookmarked' : 'Bookmark node'}
      </button>
      {errorMessage ? (
        <p className="node-bookmark-feedback" role="status" aria-live="polite">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}


