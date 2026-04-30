'use client';

import { Button } from '@/components/ui/Button';
import { NodeCommentLikeButton } from '@/components/discussions/NodeCommentLikeButton';

export function NodeCommentActions(props: {
  canReply: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canResolve: boolean;
  canReopen: boolean;
  replyCount: number;
  repliesExpanded: boolean;
  viewerHasLiked: boolean;
  likeCount: number;
  likeDisabled?: boolean;
  onToggleReplies: () => void;
  onLike: () => Promise<void> | void;
  onReply: () => void;
  onEdit: () => void;
  onDelete: () => Promise<void> | void;
  onResolve: () => Promise<void> | void;
  onReopen: () => Promise<void> | void;
}) {
  const hasReplies = props.replyCount > 0;
  const replyLabel =
    props.replyCount === 1 ? '1 reply' : `${props.replyCount} replies`;

  return (
    <div className="inline node-comment-actions">
      <NodeCommentLikeButton
        liked={props.viewerHasLiked}
        likeCount={props.likeCount}
        onToggle={props.onLike}
        disabled={props.likeDisabled}
      />
      {hasReplies ? (
        <Button
          type="button"
          variant="ghost"
          onClick={props.onToggleReplies}
          aria-expanded={props.repliesExpanded}
        >
          {props.repliesExpanded ? 'Hide replies' : `Show ${replyLabel}`}
        </Button>
      ) : null}
      {props.canReply ? (
        <Button type="button" variant="ghost" onClick={props.onReply}>
          Reply
        </Button>
      ) : null}
      {props.canEdit ? (
        <Button type="button" variant="ghost" onClick={props.onEdit}>
          Edit
        </Button>
      ) : null}
      {props.canDelete ? (
        <Button type="button" variant="danger" onClick={props.onDelete}>
          Delete
        </Button>
      ) : null}
      {props.canResolve ? (
        <Button type="button" variant="secondary" onClick={props.onResolve}>
          Mark resolved
        </Button>
      ) : null}
      {props.canReopen ? (
        <Button type="button" variant="secondary" onClick={props.onReopen}>
          Reopen
        </Button>
      ) : null}
    </div>
  );
}


