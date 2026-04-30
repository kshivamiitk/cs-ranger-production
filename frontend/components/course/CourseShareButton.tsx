'use client';

import { useEffect, useMemo, useState } from 'react';
import { Check, Link2 } from 'lucide-react';

import { cn } from '@/lib/utils';

function buildCourseShareUrl(courseId: string) {
  if (typeof window !== 'undefined') {
    return new URL(`/courses/${courseId}`, window.location.origin).toString();
  }

  const baseUrl = process.env.NEXT_PUBLIC_APP_URL?.trim();
  if (baseUrl) {
    return new URL(`/courses/${courseId}`, baseUrl).toString();
  }

  return `/courses/${courseId}`;
}

export function CourseShareButton(props: {
  courseId: string;
  courseTitle: string;
  className?: string;
}) {
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const shareUrl = useMemo(() => buildCourseShareUrl(props.courseId), [props.courseId]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopied(false), 2200);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(shareUrl);
      setCopied(true);
      setError(null);
    } catch {
      setCopied(false);
      setError('Copy failed');
    }
  }

  return (
    <button
      type="button"
      className={cn('course-share-button', copied ? 'is-copied' : undefined, props.className)}
      onClick={() => void copyLink()}
      aria-label={`Copy share link for ${props.courseTitle}`}
      title={error ?? (copied ? 'Link copied' : 'Copy course link')}
    >
      {copied ? <Check size={14} aria-hidden="true" /> : <Link2 size={14} aria-hidden="true" />}
      {copied ? 'Link copied' : 'Share'}
    </button>
  );
}


