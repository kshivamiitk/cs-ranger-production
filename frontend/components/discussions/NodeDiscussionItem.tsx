'use client';

import { useState } from 'react';
import Link from 'next/link';

import type { NodeDiscussionCommentView } from '@/src/domain/models';
import { TextArea } from '@/components/ui/TextArea';
import { Button } from '@/components/ui/Button';
import { NodeCommentActions } from '@/components/discussions/NodeCommentActions';
import { NodeDiscussionReplyComposer } from '@/components/discussions/NodeDiscussionReplyComposer';

export function NodeDiscussionItem(props: {
  comment: NodeDiscussionCommentView;
  getReplies: (commentId: string) => NodeDiscussionCommentView[];
  depth: number;
  allowInteractions: boolean;
  onCreateReply: (parentCommentId: string, body: string) => Promise<void>;
  onUpdateComment: (commentId: string, body: string) => Promise<void>;
  onDeleteComment: (commentId: string) => Promise<void>;
  onToggleLike: (commentId: string) => Promise<void>;
  onResolveComment: (commentId: string) => Promise<void>;
  onReopenComment: (commentId: string) => Promise<void>;
}) {
  const [replyOpen, setReplyOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editBody, setEditBody] = useState(props.comment.body);
  const [repliesExpanded, setRepliesExpanded] = useState(false);
  const [pending, setPending] = useState(false);
  const replies = props.getReplies(props.comment.id);
  const replyCount = replies.length;
  const margin = Math.min(props.depth, 4) * 16;
  const creatorProfileHref =
    props.comment.author?.primaryRole === 'creator' && !props.comment.author.isBanned
      ? `/creators/${props.comment.author.userId}`
      : null;

  async function runAction(action: () => Promise<void>) {
    setPending(true);
    try {
      await action();
    } finally {
      setPending(false);
    }
  }

  async function submitEdit() {
    const next = editBody.trim();
    if (!next) {
      return;
    }

    await runAction(async () => {
      await props.onUpdateComment(props.comment.id, next);
      setEditOpen(false);
    });
  }

  return (
    <article className="card node-discussion-item" style={{ marginLeft: `${margin}px` }} id={`discussion-comment-${props.comment.id}`}>
      <div className="stack" style={{ gap: 10 }}>
        <div className="panel-header">
          <div className="stack" style={{ gap: 6 }}>
            <div className="inline premium-badge-row">
              {creatorProfileHref ? (
                <Link
                  href={creatorProfileHref}
                  className="studio-badge studio-badge-muted node-discussion-author-link"
                  title="Open creator profile"
                >
                  {props.comment.author?.fullName ?? props.comment.authorUserId}
                </Link>
              ) : (
                <span className="studio-badge studio-badge-muted">
                  {props.comment.author?.fullName ?? props.comment.authorUserId}
                </span>
              )}
              {props.comment.commentTag === 'doubt' ? (
                <span className="studio-badge studio-badge-warning">Doubt</span>
              ) : null}
              {props.comment.status === 'resolved' && props.comment.parentCommentId === null ? (
                <span className="studio-badge studio-badge-success">Resolved</span>
              ) : null}
              {props.comment.isEdited ? <span className="studio-badge studio-badge-muted">Edited</span> : null}
            </div>
            {props.comment.isDeleted ? (
              <p className="muted" style={{ margin: 0 }}>This comment was deleted.</p>
            ) : editOpen ? (
              <div className="stack" style={{ gap: 8 }}>
                <TextArea
                  value={editBody}
                  rows={3}
                  onChange={(event) => setEditBody(event.target.value)}
                  disabled={pending}
                />
                <div className="inline">
                  <Button type="button" variant="secondary" onClick={() => void submitEdit()} disabled={pending}>
                    Save
                  </Button>
                  <Button type="button" variant="ghost" onClick={() => setEditOpen(false)} disabled={pending}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="node-discussion-body">{props.comment.body}</p>
            )}
          </div>
        </div>

        {!editOpen ? (
          <NodeCommentActions
            canReply={props.comment.canReply && props.allowInteractions}
            canEdit={props.comment.canEdit && props.allowInteractions}
            canDelete={props.comment.canDelete && props.allowInteractions}
            canResolve={props.comment.canResolve && props.allowInteractions}
            canReopen={props.comment.canReopen && props.allowInteractions}
            replyCount={replyCount}
            repliesExpanded={repliesExpanded}
            viewerHasLiked={props.comment.viewerHasLiked}
            likeCount={props.comment.likeCount}
            likeDisabled={!props.allowInteractions || pending}
            onToggleReplies={() => setRepliesExpanded((current) => !current)}
            onLike={() => runAction(() => props.onToggleLike(props.comment.id))}
            onReply={() => {
              setReplyOpen((current) => !current);
              if (replyCount > 0) {
                setRepliesExpanded(true);
              }
            }}
            onEdit={() => {
              setEditBody(props.comment.body);
              setEditOpen(true);
            }}
            onDelete={() => runAction(() => props.onDeleteComment(props.comment.id))}
            onResolve={() => runAction(() => props.onResolveComment(props.comment.id))}
            onReopen={() => runAction(() => props.onReopenComment(props.comment.id))}
          />
        ) : null}

        {replyOpen ? (
          <NodeDiscussionReplyComposer
            disabled={!props.allowInteractions || pending}
            pending={pending}
            onSubmit={(body) =>
              runAction(async () => {
                await props.onCreateReply(props.comment.id, body);
                setReplyOpen(false);
              })
            }
          />
        ) : null}

        {replyCount > 0 && repliesExpanded ? (
          <div className="stack node-discussion-children">
            {replies.map((reply) => (
              <NodeDiscussionItem
                key={reply.id}
                comment={reply}
                getReplies={props.getReplies}
                depth={props.depth + 1}
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
        ) : null}
      </div>
    </article>
  );
}


