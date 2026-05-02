import Link from 'next/link';
import { CheckCircle2, ChevronDown, ChevronRight, Crown, Layers3, LockKeyhole, Sparkles, Unlock } from 'lucide-react';

import type { CourseTreeModule, CourseTreeNode } from '@/src/domain/models';
import { describeNodeLearnerAccess, getNodeLearnerSubtitle } from '@/src/presentation/nodeMeta';
import { NodeTypeBadge } from '@/components/learner/NodeTypeBadge';

function nodeReaderHref(courseId: string, nodeId: string) {
  return `/courses/${courseId}/nodes/${nodeId}`;
}

type CourseModuleNavigatorVariant = 'rail' | 'roadmap';

export function CourseModuleNavigator(props: {
  courseId: string;
  modules: CourseTreeModule[];
  activeModuleId: string | null;
  activeNodeId: string | null;
  variant?: CourseModuleNavigatorVariant;
}) {
  const variant = props.variant ?? 'rail';

  if (props.modules.length === 0) {
    return (
      <section className="learner-rail-panel">
        <div className="section-label">Modules</div>
        <div className="studio-empty-state compact">
          No published modules yet. The course tree will appear here once the creator adds structure.
        </div>
      </section>
    );
  }

  return (
    <section className={`learner-rail-panel fade-in-panel course-module-navigator course-module-navigator-${variant}`}>
      <div className="course-rail-header">
        <div>
          <div className="section-label">{variant === 'roadmap' ? 'Curriculum path' : 'Module navigator'}</div>
          <h3 className="panel-title course-module-heading">
            {variant === 'roadmap' ? 'Modules and lesson nodes' : 'Modules'}
          </h3>
          {variant === 'roadmap' ? (
            <p className="muted course-module-navigator-copy">
              Open a module to reveal its node cards. Each node has its own reader page, access state, and completion marker.
            </p>
          ) : null}
        </div>
        <span className="studio-badge studio-badge-muted">
          <Layers3 size={14} />
          {props.modules.length} module{props.modules.length === 1 ? '' : 's'}
        </span>
      </div>

      <div className="learner-rail-list">
        {props.modules.map((module, index) => {
          const hasActiveNode = module.nodes.some((node) => node.id === props.activeNodeId);
          const isActiveModule = props.activeModuleId === module.id || hasActiveNode;
          const openByDefault = isActiveModule || (props.activeModuleId === null && index === 0);

          return (
            <details
              key={module.id}
              className="course-module-accordion"
              data-active={isActiveModule}
              data-variant={variant}
              open={openByDefault}
            >
              <summary className="course-module-accordion-trigger">
                <div className="course-module-rail-leading">
                  <span className="course-module-rail-index">{String(module.position).padStart(2, '0')}</span>
                  <span className="studio-badge studio-badge-muted">
                    {module.nodes.length} node{module.nodes.length === 1 ? '' : 's'}
                  </span>
                  {module.accessibleNodeCount > 0 ? (
                    <span className="studio-badge studio-badge-primary">
                      {module.completionPercent}% complete
                    </span>
                  ) : null}
                </div>

                <div className="course-module-rail-copy">
                  <strong className="course-module-rail-title">{module.title}</strong>
                  <p className="course-module-rail-summary">{module.summary}</p>
                  {variant === 'roadmap' && module.accessibleNodeCount > 0 ? (
                    <progress
                      className="course-module-progress-line"
                      max={100}
                      value={Math.min(100, Math.max(0, module.completionPercent))}
                      aria-label={`${module.completionPercent}% complete`}
                    >
                      {module.completionPercent}%
                    </progress>
                  ) : null}
                </div>

                <span className="course-module-accordion-chevron">
                  <ChevronDown size={16} />
                </span>
              </summary>

              <div className="course-module-node-list" data-variant={variant}>
                {module.nodes.length === 0 ? (
                  <div className="studio-empty-state compact">
                    No published nodes in this module yet.
                  </div>
                ) : (
                  module.nodes.map((node) => (
                    <NodeLink
                      key={node.id}
                      courseId={props.courseId}
                      node={node}
                      active={props.activeNodeId === node.id}
                      variant={variant}
                    />
                  ))
                )}
              </div>
            </details>
          );
        })}
      </div>
    </section>
  );
}

function NodeLink(props: {
  courseId: string;
  node: CourseTreeNode;
  active: boolean;
  variant: CourseModuleNavigatorVariant;
}) {
  const access = describeNodeLearnerAccess(props.node);

  return (
    <Link
      href={nodeReaderHref(props.courseId, props.node.id)}
      className="module-node-list-item course-module-node-link"
      data-active={props.active}
      data-variant={props.variant}
      data-locked={props.node.isLocked}
      data-completed={props.node.isCompleted}
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
      </div>

      <div className="module-node-list-footer">
        <span className="inline premium-badge-row module-node-badge-row">
          {props.node.isCompleted ? (
            <span className="studio-badge studio-badge-success">
              <CheckCircle2 size={12} />
              Completed
            </span>
          ) : null}
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
        <span className="module-node-list-open-copy">Open node page</span>
      </div>
    </Link>
  );
}
