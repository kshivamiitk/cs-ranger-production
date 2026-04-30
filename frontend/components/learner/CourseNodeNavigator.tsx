import Link from 'next/link';
import { ChevronRight, Crown, LockKeyhole, Sparkles, Unlock } from 'lucide-react';

import type { CourseTreeModule, CourseTreeNode } from '@/src/domain/models';
import { describeNodeLearnerAccess, getNodeLearnerSubtitle, getNodeSummary } from '@/src/presentation/nodeMeta';
import { NodeTypeBadge } from '@/components/learner/NodeTypeBadge';

function nodeHref(courseId: string, nodeId: string) {
  return `/courses/${courseId}?node=${nodeId}#course-workspace`;
}

export function CourseNodeNavigator(props: {
  courseId: string;
  module: CourseTreeModule | null;
  activeNodeId: string | null;
}) {
  if (!props.module) {
    return (
      <section className="learner-rail-panel">
        <div className="section-label">Nodes</div>
        <div className="studio-empty-state compact">
          Select a module to browse its nodes.
        </div>
      </section>
    );
  }

  return (
    <section className="learner-rail-panel fade-in-panel">
      <div className="course-rail-header">
        <div>
          <div className="section-label">Node navigator</div>
          <h3 className="panel-title" style={{ marginTop: 10 }}>{props.module.title}</h3>
        </div>
        <span className="studio-badge studio-badge-muted">
          {props.module.nodes.length} node{props.module.nodes.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="learner-node-rail-list">
        {props.module.nodes.map((node) => (
          <NodeNavigatorItem
            key={node.id}
            courseId={props.courseId}
            node={node}
            active={props.activeNodeId === node.id}
          />
        ))}
      </div>
    </section>
  );
}

function NodeNavigatorItem(props: {
  courseId: string;
  node: CourseTreeNode;
  active: boolean;
}) {
  const access = describeNodeLearnerAccess(props.node);

  return (
    <Link
      href={nodeHref(props.courseId, props.node.id)}
      className="module-node-list-item learner-node-rail-item"
      data-active={props.active}
    >
      <div className="module-node-list-leading">
        <span className="module-node-order">{String(props.node.position).padStart(2, '0')}</span>
        <NodeTypeBadge type={props.node.type} size="sm" />
      </div>

      <div className="module-node-list-copy">
        <div className="module-node-list-title-row">
          <strong className="module-node-list-title">{props.node.title}</strong>
          <ChevronRight size={16} className="module-node-list-chevron" />
        </div>
        <p className="module-node-list-subtitle">{getNodeLearnerSubtitle(props.node)}</p>
        <p className="module-node-list-meta">{getNodeSummary(props.node)}</p>
      </div>

      <div className="module-node-list-footer">
        <span className="inline premium-badge-row" style={{ gap: 8 }}>
          {props.node.isPremium ? (
            <span className={`studio-badge ${props.node.isLocked ? 'studio-badge-muted' : access.tone}`}>
              {props.node.isLocked ? <Crown size={12} /> : <Unlock size={12} />}
              {access.label}
            </span>
          ) : (
            <span className="studio-badge studio-badge-success">
              <Sparkles size={12} />
              Free
            </span>
          )}
          {props.node.isLocked ? (
            <span className="studio-badge studio-badge-muted">
              <LockKeyhole size={12} />
              Locked
            </span>
          ) : null}
        </span>
        <span className="module-node-list-open-copy">
          {props.node.isLocked ? 'Preview details' : 'Open in stage'}
        </span>
      </div>
    </Link>
  );
}


