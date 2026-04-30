'use client';

import type { ReactNode } from 'react';
import { useState } from 'react';
import { Expand } from 'lucide-react';

import type { ContentSectionKey } from '@/src/domain/contentSections';
import type { CourseNode } from '@/src/domain/models';
import type { HtmlSandboxNavigation } from '@/components/renderers/HtmlSandbox';
import { NodeRenderer } from '@/components/renderers/NodeRenderer';
import { NodeTypeBadge } from '@/components/learner/NodeTypeBadge';
import { ImmersiveNodeDialog } from '@/components/learner/ImmersiveNodeDialog';
import { Button } from '@/components/ui/Button';

export function LearnerNodeStage(props: {
  courseId: string;
  courseTitle: string;
  moduleTitle: string;
  node: CourseNode;
  interactiveQuiz: boolean;
  eyebrow?: string;
  summary?: string | null;
  actions?: ReactNode;
  contentSectionKey?: ContentSectionKey | null;
  htmlNavigation?: HtmlSandboxNavigation;
  progressEnabled?: boolean;
}) {
  const [immersiveOpen, setImmersiveOpen] = useState(false);

  return (
    <>
      <section className="learner-node-stage fade-in-panel">
        <div className="learner-node-stage-header">
          <div className="stack" style={{ gap: 10 }}>
            <div className="inline premium-badge-row">
              <NodeTypeBadge type={props.node.type} />
              <span className="studio-badge studio-badge-muted">{props.moduleTitle}</span>
            </div>
            <div>
              <h2 className="headline learner-node-stage-title">{props.node.title}</h2>
              {props.summary ? <p className="subheadline learner-node-stage-summary">{props.summary}</p> : null}
            </div>
          </div>

          <div className="learner-node-stage-actions">
            {props.actions}
            <Button type="button" variant="ghost" onClick={() => setImmersiveOpen(true)}>
              <Expand size={16} />
              Full screen
            </Button>
          </div>
        </div>

        <div className="learner-node-stage-body">
          <NodeRenderer
            courseId={props.courseId}
            node={props.node}
            interactiveQuiz={props.interactiveQuiz}
            showTitle={false}
            mode="reader"
            contentSectionKey={props.contentSectionKey}
            htmlNavigation={props.htmlNavigation}
            progressEnabled={props.progressEnabled}
          />
        </div>
      </section>

      <ImmersiveNodeDialog
        open={immersiveOpen}
        title={props.node.title}
        subtitle={`${props.courseTitle} · ${props.moduleTitle}`}
        onClose={() => setImmersiveOpen(false)}
      >
        <div className="immersive-node-stage">
          <NodeRenderer
            courseId={props.courseId}
            node={props.node}
            interactiveQuiz={props.interactiveQuiz}
            showTitle={false}
            mode="immersive"
            contentSectionKey={props.contentSectionKey}
            htmlNavigation={props.htmlNavigation}
            progressEnabled={props.progressEnabled}
          />
        </div>
      </ImmersiveNodeDialog>
    </>
  );
}

