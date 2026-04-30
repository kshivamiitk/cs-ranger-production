'use client';

import { useState } from 'react';

import { cn } from '@/lib/utils';

export function BrandSymbol(props: {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}) {
  const [showFallback, setShowFallback] = useState(false);

  return (
    <div className={cn('brand-symbol', props.className)} data-size={props.size ?? 'md'} aria-hidden="true">
      {!showFallback ? (
        <img
          src="/image.jpg"
          alt=""
          className="brand-symbol-image"
          onError={() => setShowFallback(true)}
        />
      ) : null}
      {showFallback ? <div className="brand-symbol-fallback">CS</div> : null}
    </div>
  );
}


