'use client';

import { useState, useTransition } from 'react';
import { Bookmark, BookmarkCheck } from 'lucide-react';

import { apiJson } from '@/src/presentation/http/client';
import { cn } from '@/lib/utils';

export function CourseWishlistButton(props: {
  courseId: string;
  initialWishlisted: boolean;
  initialCount: number;
}) {
  const [wishlisted, setWishlisted] = useState(props.initialWishlisted);
  const [count, setCount] = useState(props.initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    startTransition(async () => {
      const nextWishlisted = !wishlisted;

      try {
        await apiJson(`/api/courses/${props.courseId}/wishlist`, {
          method: nextWishlisted ? 'POST' : 'DELETE',
        });
        setWishlisted(nextWishlisted);
        setCount((current) => Math.max(current + (nextWishlisted ? 1 : -1), 0));
      } catch {
        // Keep card interaction silent; wishlist failures surface through route errors when needed.
      }
    });
  }

  return (
    <button
      type="button"
      className={cn('catalog-wishlist-button', wishlisted ? 'is-active' : undefined)}
      onClick={toggle}
      disabled={pending}
      aria-pressed={wishlisted}
      aria-label={wishlisted ? 'Remove from wishlist' : 'Save for later'}
    >
      {wishlisted ? <BookmarkCheck size={15} /> : <Bookmark size={15} />}
      <span>{wishlisted ? 'Saved' : 'Save for later'}</span>
      <span className="catalog-wishlist-count">{count}</span>
    </button>
  );
}


