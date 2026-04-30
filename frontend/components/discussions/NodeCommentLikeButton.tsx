'use client';

import { Heart } from 'lucide-react';

import { cn } from '@/lib/utils';

export function NodeCommentLikeButton(props: {
  liked: boolean;
  likeCount: number;
  disabled?: boolean;
  onToggle: () => Promise<void> | void;
}) {
  return (
    <button
      type="button"
      className={cn('button button-ghost node-comment-like', props.liked ? 'is-liked' : undefined)}
      onClick={() => props.onToggle()}
      disabled={props.disabled}
      aria-pressed={props.liked}
    >
      <Heart size={14} />
      {props.likeCount}
    </button>
  );
}


