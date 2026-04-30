'use client';

import { BookOpen, Image as ImageIcon, Sparkles } from 'lucide-react';
import { useEffect, useState } from 'react';

import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { cn } from '@/lib/utils';

export function CourseImagePreview(props: {
  title: string;
  description?: string | null;
  imageUrl: string | null;
  className?: string;
  compact?: boolean;
  badge?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [props.imageUrl]);

  const showImage = Boolean(props.imageUrl) && !hasError;

  return (
    <div className={cn('course-visual', props.compact ? 'course-visual-compact' : 'course-visual-large', props.className)}>
      {showImage ? (
        <img
          src={props.imageUrl ?? ''}
          alt={props.title}
          className="course-visual-media"
          onError={() => setHasError(true)}
        />
      ) : (
        <div className="course-visual-fallback" aria-hidden="true">
          <div className="course-visual-icon-shell">
            {props.imageUrl ? <ImageIcon size={24} /> : <BookOpen size={24} />}
          </div>
          <BrandSymbol className="course-visual-brand-symbol" size="sm" />
          <div className="course-visual-marks">
            <span>{props.title.slice(0, 1).toUpperCase() || 'C'}</span>
            <Sparkles size={18} />
          </div>
        </div>
      )}

      <div className="course-visual-overlay">
        {props.badge ? <span className="course-visual-badge">{props.badge}</span> : null}
        <div>
          <div className="course-visual-title">{props.title || 'Untitled course'}</div>
          <p className="course-visual-copy">{props.description?.trim() || 'Cover preview updates as you edit the course details.'}</p>
        </div>
      </div>
    </div>
  );
}


