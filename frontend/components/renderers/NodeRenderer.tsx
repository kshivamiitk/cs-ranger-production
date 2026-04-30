'use client';

import type { ReactNode } from 'react';
import {
  contentNodeSections,
  getContentSectionByKey,
  type ContentSectionKey,
} from '@/src/domain/contentSections';
import type {
  ContentNodePayload,
  CourseNode,
  HtmlNodePayload,
  GithubNodePayload,
  PdfNodePayload,
  QuestionNodePayload,
  QuizNodePayload,
  VideoNodePayload,
} from '@/src/domain/models';
import { HtmlSandbox, type HtmlSandboxNavigation } from '@/components/renderers/HtmlSandbox';
import { GithubWebsiteEmbed } from '@/components/renderers/GithubWebsiteEmbed';
import { PdfEmbed } from '@/components/renderers/PdfEmbed';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';
import { VideoEmbed } from '@/components/renderers/VideoEmbed';
import { QuizAttemptCard } from '@/components/learner/QuizAttemptCard';

type NodeRenderMode = 'preview' | 'reader' | 'immersive';

function NodeHeading(props: { title: string; showTitle: boolean }) {
  if (!props.showTitle) {
    return null;
  }

  return <h3 className="panel-title" style={{ margin: 0 }}>{props.title}</h3>;
}

function NodeSection(props: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={`node-stage-section${props.className ? ` ${props.className}` : ''}`}>
      <div className="node-stage-section-header">
        <div className="node-stage-section-label">{props.label}</div>
      </div>
      {props.children}
    </section>
  );
}

function ContentNodeView(props: {
  title: string;
  payload: ContentNodePayload;
  showTitle: boolean;
  mode: NodeRenderMode;
  sectionKey?: ContentSectionKey | null;
}) {
  const visibleSections = props.sectionKey
    ? [getContentSectionByKey(props.sectionKey)]
    : contentNodeSections;

  return (
    <div className="stack node-renderer-root" data-mode={props.mode}>
      <NodeHeading title={props.title} showTitle={props.showTitle} />
      {visibleSections.map((section) => (
        <NodeSection
          key={section.key}
          label={section.label}
          className="content-node-section"
        >
          <RichContentRenderer
            format={props.payload[section.key].format}
            content={props.payload[section.key].content}
          />
        </NodeSection>
      ))}
    </div>
  );
}

function HtmlNodeView(props: {
  title: string;
  payload: HtmlNodePayload;
  showTitle: boolean;
  mode: NodeRenderMode;
  courseId?: string;
  nodeId: string;
  progressEnabled?: boolean;
  navigation?: HtmlSandboxNavigation;
}) {
  return (
    <div className="stack node-renderer-root" data-mode={props.mode}>
      <NodeHeading title={props.title} showTitle={props.showTitle} />
      <HtmlSandbox
        html={props.payload.html}
        css={props.payload.css}
        javascript={props.payload.javascript}
        title={props.title}
        courseId={props.courseId}
        nodeId={props.nodeId}
        progressEnabled={props.progressEnabled}
        navigation={props.navigation}
      />
    </div>
  );
}

function QuestionNodeView(props: {
  title: string;
  payload: QuestionNodePayload;
  showTitle: boolean;
  mode: NodeRenderMode;
}) {
  return (
    <div className="stack node-renderer-root" data-mode={props.mode}>
      <NodeHeading title={props.title} showTitle={props.showTitle} />
      {props.payload.items.map((item, index) => (
        <NodeSection key={item.id} label={`Question ${index + 1}`} className="node-stage-question">
          <RichContentRenderer format={props.payload.format} content={item.prompt} />
          <div className="divider" />
          <div className="node-stage-section-label">Solution</div>
          <RichContentRenderer format={props.payload.format} content={item.solution} />
        </NodeSection>
      ))}
    </div>
  );
}

function VideoNodeView(props: {
  title: string;
  payload: VideoNodePayload;
  showTitle: boolean;
  mode: NodeRenderMode;
}) {
  return (
    <div className="stack node-renderer-root" data-mode={props.mode}>
      <NodeHeading title={props.title} showTitle={props.showTitle} />
      <VideoEmbed url={props.payload.videoUrl} title={props.title} />
      <NodeSection label="Notes">
        <RichContentRenderer format={props.payload.format} content={props.payload.note} />
      </NodeSection>
    </div>
  );
}

function PdfNodeView(props: {
  title: string;
  payload: PdfNodePayload;
  showTitle: boolean;
  mode: NodeRenderMode;
}) {
  return (
    <div className="stack node-renderer-root" data-mode={props.mode}>
      <NodeHeading title={props.title} showTitle={props.showTitle} />
      <PdfEmbed payload={props.payload} title={props.title} />
    </div>
  );
}

function GithubNodeView(props: {
  title: string;
  payload: GithubNodePayload;
  showTitle: boolean;
  mode: NodeRenderMode;
}) {
  return (
    <div className="stack node-renderer-root" data-mode={props.mode}>
      <NodeHeading title={props.title} showTitle={props.showTitle} />
      <GithubWebsiteEmbed payload={props.payload} title={props.title} />
    </div>
  );
}


export function NodeRenderer(props: {
  courseId?: string;
  node: CourseNode;
  interactiveQuiz?: boolean;
  showTitle?: boolean;
  mode?: NodeRenderMode;
  contentSectionKey?: ContentSectionKey | null;
  htmlNavigation?: HtmlSandboxNavigation;
  progressEnabled?: boolean;
}) {
  const mode = props.mode ?? 'preview';
  const showTitle = props.showTitle ?? true;

  switch (props.node.type) {
    case 'content':
      return (
        <ContentNodeView
          title={props.node.title}
          payload={props.node.payload as ContentNodePayload}
          showTitle={showTitle}
          mode={mode}
          sectionKey={props.contentSectionKey}
        />
      );
    case 'html':
      return (
        <HtmlNodeView
          title={props.node.title}
          payload={props.node.payload as HtmlNodePayload}
          showTitle={showTitle}
          mode={mode}
          courseId={props.courseId}
          nodeId={props.node.id}
          progressEnabled={props.progressEnabled}
          navigation={props.htmlNavigation}
        />
      );
    case 'question':
      return <QuestionNodeView title={props.node.title} payload={props.node.payload as QuestionNodePayload} showTitle={showTitle} mode={mode} />;
    case 'quiz':
      return (
        <QuizAttemptCard
          courseId={props.courseId}
          nodeId={props.node.id}
          title={props.node.title}
          payload={props.node.payload as QuizNodePayload}
          interactive={Boolean(props.interactiveQuiz)}
          showTitle={showTitle}
          mode={mode}
        />
      );
    case 'video':
      return <VideoNodeView title={props.node.title} payload={props.node.payload as VideoNodePayload} showTitle={showTitle} mode={mode} />;
    case 'pdf':
      return <PdfNodeView title={props.node.title} payload={props.node.payload as PdfNodePayload} showTitle={showTitle} mode={mode} />;
    case 'github':
      return <GithubNodeView title={props.node.title} payload={props.node.payload as GithubNodePayload} showTitle={showTitle} mode={mode} />;
    default:
      return null;
  }
}


