'use client';

import type { NodeDiscussionCommentView } from '@/src/domain/models';
import { NodeDiscussionItem } from '@/components/discussions/NodeDiscussionItem';
import { NodeDiscussionEmptyState } from '@/components/discussions/NodeDiscussionEmptyState';

export function NodeDiscussionList(props: {
  comments: NodeDiscussionCommentView[];
  allowInteractions: boolean;
  onCreateReply: (parentCommentId: string, body: string) => Promise<void>;
  onUpdateComment: (commentId: string, body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleLike: (commentId: string) => Promise<void>;
  onResolveComment: (commentId: string) => Promise<void>;
  onReopenComment: (commentId: string) => Promise<void>;
}) {
  if (props.comments.length === 0) {
    return <NodeDiscussionEmptyState />;
  }

  const childrenByParentId = new Map<string, NodeDiscussionCommentView[]>();
  const topLevelComments: NodeDiscussionCommentView[] = [];

  for (const comment of props.comments) {
    if (!comment.parentCommentId) {
      topLevelComments.push(comment);
      continue;
    }

    const current = childrenByParentId.get(comment.parentCommentId) ?? [];
    current.push(comment);
    childrenByParentId.set(comment.parentCommentId, current);
  }

  function getReplies(commentId: string) {
    return childrenByParentId.get(commentId) ?? [];
  }

  return (
    <div className="stack node-discussion-list">
      {topLevelComments.map((comment) => (
        <NodeDiscussionItem
          key={comment.id}
          comment={comment}
          getReplies={getReplies}
          depth={0}
          allowInteractions={props.allowInteractions}
          onCreateReply={props.onCreateReply}
          onUpdateComment={props.onUpdateComment}
          onDeleteComment={props.onDeleteComment}
          onToggleLike={props.onToggleLike}
          onResolveComment={props.onResolveComment}
          onReopenComment={props.onReopenComment}
        />
      ))}
    </div>
  );
}


