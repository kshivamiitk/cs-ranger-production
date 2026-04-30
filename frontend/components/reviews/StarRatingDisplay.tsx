import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

export function StarRatingDisplay(props: {
  rating: number;
  outOf?: number;
  className?: string;
}) {
  const outOf = props.outOf ?? 5;
  const fullStars = Math.max(0, Math.min(outOf, Math.round(props.rating)));

  return (
    <div className={cn('inline star-rating-display', props.className)} aria-label={`Rating ${props.rating} out of ${outOf}`}>
      {Array.from({ length: outOf }, (_, index) => (
        <Star
          key={index}
          size={14}
          className={cn('star-rating-icon', index < fullStars ? 'is-filled' : undefined)}
          fill={index < fullStars ? 'currentColor' : 'none'}
          strokeWidth={1.9}
        />
      ))}
    </div>
  );
}


