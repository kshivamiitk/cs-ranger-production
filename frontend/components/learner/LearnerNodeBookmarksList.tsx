'use client';

import { useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, Bookmark } from 'lucide-react';

import { formatDateLabel } from '@/lib/utils';
import type { BookmarkedNodeView } from '@/src/domain/models';
import { NodeBookmarkButton } from '@/components/learner/NodeBookmarkButton';
import { NodeTypeBadge } from '@/components/learner/NodeTypeBadge';
import { describeNodeLearnerAccess } from '@/src/presentation/nodeMeta';

function nodeHref(courseId: string, nodeId: string) {
  return `/courses/${courseId}/nodes/${nodeId}`;
}

export function LearnerNodeBookmarksList(props: { items: BookmarkedNodeView[] }) {
  const [items, setItems] = useState(props.items);

  if (items.length === 0) {
    return (
      <div className="empty-state">
        No bookmarked nodes yet. Open a node you want to revisit later and save it from the reader page.
      </div>
    );
  }

  return (
    <div className="stack">
      {items.map((item) => {
        const access = describeNodeLearnerAccess(item);

        return (
        <article key={item.nodeId} className="card bookmark-node-card">
          <div className="bookmark-node-card-header">
            <div className="stack" style={{ gap: 10 }}>
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-muted">{item.courseTitle}</span>
                <span className="studio-badge studio-badge-muted">Module {item.modulePosition}</span>
                <NodeTypeBadge type={item.nodeType} size="sm" />
                <span className={`studio-badge ${item.isPremium ? (item.isLocked ? 'studio-badge-primary' : 'studio-badge-success') : 'studio-badge-success'}`}>
                  {item.isPremium ? `${access.label} node` : 'Free node'}
                </span>
                {item.isLocked ? (
                  <span className="studio-badge studio-badge-warning">Locked right now</span>
                ) : (
                  <span className="studio-badge studio-badge-success">Ready to open</span>
                )}
              </div>
              <div className="stack" style={{ gap: 6 }}>
                <h3 className="panel-title" style={{ margin: 0 }}>{item.nodeTitle}</h3>
                <p className="muted bookmark-node-card-copy" style={{ margin: 0 }}>
                  {item.nodeExcerpt ?? `${item.moduleTitle} · saved ${formatDateLabel(item.savedAt)}`}
                </p>
              </div>
            </div>

            <div className="bookmark-node-card-actions">
              <NodeBookmarkButton
                courseId={item.courseId}
                nodeId={item.nodeId}
                initialBookmarked={true}
                enabled={true}
                className="bookmark-node-toggle"
                onBookmarkedChange={(bookmarked) => {
                  if (!bookmarked) {
                    setItems((current) => current.filter((entry) => entry.nodeId !== item.nodeId));
                  }
                }}
              />
              <Link href={nodeHref(item.courseId, item.nodeId)} className="button">
                <ArrowUpRight size={16} />
                Open bookmark
              </Link>
            </div>
          </div>

          <div className="inline premium-badge-row bookmark-node-card-meta">
            <span className="inline muted">
              <Bookmark size={14} />
              Saved {formatDateLabel(item.savedAt)}
            </span>
            <span className="muted">{item.moduleTitle}</span>
          </div>
        </article>
        );
      })}
    </div>
  );
}


