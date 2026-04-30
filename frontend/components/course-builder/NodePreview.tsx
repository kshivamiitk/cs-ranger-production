'use client';

import type { CourseNode } from '@/src/domain/models';
import { ScrollablePreviewPanel } from '@/components/preview/ScrollablePreviewPanel';
import { NodeRenderer } from '@/components/renderers/NodeRenderer';

export function NodePreview(props: {
  node: CourseNode;
  courseId?: string;
}) {
  return (
    <ScrollablePreviewPanel
      className="module-node-preview-panel"
      label="Selected node preview"
      description="This uses the same shared learner renderer and fullscreen path that published course pages use."
      maxHeight={860}
      minHeight={620}
      fullScreenTitle={props.node.title}
      tone={props.node.type === 'html' || props.node.type === 'video' ? 'media' : 'default'}
      immersive
      fullScreenBodyClassName="fullscreen-node-stage"
    >
      <NodeRenderer node={props.node} courseId={props.courseId} interactiveQuiz={false} />
    </ScrollablePreviewPanel>
  );
}


