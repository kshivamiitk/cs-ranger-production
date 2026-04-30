'use client';

import { useState } from 'react';
import { Star } from 'lucide-react';

import { cn } from '@/lib/utils';

export function StarRatingInput(props: {
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
}) {
  const [hoveredValue, setHoveredValue] = useState<number | null>(null);

  return (
    <div
      className="inline star-rating-input"
      role="radiogroup"
      aria-label="Course rating"
      onMouseLeave={() => setHoveredValue(null)}
    >
      {Array.from({ length: 5 }, (_, index) => {
        const value = index + 1;
        const active = value <= (hoveredValue ?? props.value);

        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === props.value}
            className={cn('star-rating-button', active ? 'is-active' : undefined)}
            onClick={() => props.onChange(value)}
            onMouseEnter={() => setHoveredValue(value)}
            onFocus={() => setHoveredValue(value)}
            onBlur={() => setHoveredValue(null)}
            disabled={props.disabled}
          >
            <Star
              size={18}
              className="star-rating-button-icon"
              fill={active ? 'currentColor' : 'none'}
              strokeWidth={1.9}
            />
          </button>
        );
      })}
    </div>
  );
}


