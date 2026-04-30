'use client';

import { useState, useTransition } from 'react';

import type { NodeDiscussionView } from '@/src/domain/models';
import { apiJson } from '@/src/presentation/http/client';
import { NodeDiscussionComposer } from '@/components/discussions/NodeDiscussionComposer';
import { Button } from '@/components/ui/Button';
import { NodeDiscussionList } from '@/components/discussions/NodeDiscussionList';

export function NodeDiscussionSection(props: {
  nodeId: string;
  initialView: NodeDiscussionView;
}) {
  const [view, setView] = useState(props.initialView);
  const [error, setError] = useState<string | null>(null);
  const [topLevelCommentTag, setTopLevelCommentTag] = useState<'discussion' | 'doubt'>('discussion');
  const [pending, startTransition] = useTransition();
  const firstUnresolvedDoubt = view.comments.find(
    (comment) =>
      comment.parentCommentId === null &&
      comment.commentTag === 'doubt' &&
      comment.status === 'open' &&
      !comment.isDeleted
  );

  function refreshDiscussion() {
    return apiJson<{ discussion: NodeDiscussionView }>(`/api/nodes/${props.nodeId}/discussions/comments`).then(
      (response) => {
        setView(response.discussion);
      }
    );
  }

  function runAction(action: () => Promise<void>) {
    setError(null);
    return new Promise<void>((resolve, reject) => {
      startTransition(async () => {
        try {
          await action();
          await refreshDiscussion();
          resolve();
        } catch (caught) {
          setError(caught instanceof Error ? caught.message : 'Discussion update failed.');
          reject(caught);
        }
      });
    });
  }

  return (
    <section className="panel stack node-discussion-section">
      <div className="stack" style={{ gap: 8 }}>
        <h2 className="panel-title">Node discussion</h2>
        <p className="muted" style={{ margin: 0 }}>
          Ask questions, share insights, and reply in-thread. Use the <strong>Doubt</strong> tag to send a comment into the creator doubts queue.
        </p>
        {view.preview.thread.unresolvedCount > 0 ? (
          <div className="inline premium-badge-row">
            {firstUnresolvedDoubt ? (
              <a
                href={`#discussion-comment-${firstUnresolvedDoubt.id}`}
                className="studio-badge studio-badge-warning"
              >
                {view.preview.thread.unresolvedCount} unresolved doubt
                {view.preview.thread.unresolvedCount === 1 ? '' : 's'}
              </a>
            ) : (
              <span className="studio-badge studio-badge-warning">
                {view.preview.thread.unresolvedCount} unresolved doubt
                {view.preview.thread.unresolvedCount === 1 ? '' : 's'}
              </span>
            )}
          </div>
        ) : null}
      </div>

      {view.canParticipate ? (
        <div className="stack" style={{ gap: 10 }}>
          <div className="inline node-discussion-tag-row" role="group" aria-label="Top-level comment tag">
            <Button
              type="button"
              variant={topLevelCommentTag === 'discussion' ? 'secondary' : 'ghost'}
              className={topLevelCommentTag === 'discussion' ? 'node-discussion-tag-button is-active' : 'node-discussion-tag-button'}
              onClick={() => setTopLevelCommentTag('discussion')}
              disabled={pending}
            >
              Comment
            </Button>
            <Button
              type="button"
              variant={topLevelCommentTag === 'doubt' ? 'secondary' : 'ghost'}
              className={topLevelCommentTag === 'doubt' ? 'node-discussion-tag-button is-active' : 'node-discussion-tag-button'}
              onClick={() => setTopLevelCommentTag('doubt')}
              disabled={pending}
            >
              Doubt
            </Button>
            <span className="muted node-discussion-tag-help">
              {topLevelCommentTag === 'doubt'
                ? 'This comment is routed to the creator doubts queue.'
                : 'This stays a regular discussion comment.'}
            </span>
          </div>
          <NodeDiscussionComposer
            onSubmit={(body) =>
              runAction(async () => {
                await apiJson(`/api/nodes/${props.nodeId}/discussions/comments`, {
                  method: 'POST',
                  body: JSON.stringify({
                    body,
                    commentTag: topLevelCommentTag,
                    parentCommentId: null,
                  }),
                });
              })
            }
            pending={pending}
            disabled={pending}
            placeholder="Write a comment about this node..."
            submitLabel={topLevelCommentTag === 'doubt' ? 'Post doubt' : 'Post'}
          />
        </div>
      ) : (
        <div className="tag">Log in with valid node access to comment, reply, and like.</div>
      )}

      {error ? <div className="studio-inline-alert">{error}</div> : null}

      <NodeDiscussionList
        comments={view.comments}
        allowInteractions={view.canParticipate && !pending}
        onCreateReply={(parentCommentId, body) =>
          runAction(async () => {
            await apiJson(`/api/nodes/${props.nodeId}/discussions/comments`, {
              method: 'POST',
              body: JSON.stringify({
                body,
                parentCommentId,
              }),
            });
          })
        }
        onUpdateComment={(commentId, body) =>
          runAction(async () => {
            await apiJson(`/api/discussions/comments/${commentId}`, {
              method: 'PATCH',
              body: JSON.stringify({ body }),
            });
          })
        }
        onDeleteComment={(commentId) =>
          runAction(async () => {
            await apiJson(`/api/discussions/comments/${commentId}`, {
              method: 'DELETE',
            });
          })
        }
        onToggleLike={(commentId) =>
          runAction(async () => {
            await apiJson(`/api/discussions/comments/${commentId}/likes/toggle`, {
              method: 'POST',
            });
          })
        }
        onResolveComment={(commentId) =>
          runAction(async () => {
            await apiJson(`/api/discussions/comments/${commentId}/resolve`, {
              method: 'POST',
            });
          })
        }
        onReopenComment={(commentId) =>
          runAction(async () => {
            await apiJson(`/api/discussions/comments/${commentId}/reopen`, {
              method: 'POST',
            });
          })
        }
      />
    </section>
  );
}


