'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Sparkles } from 'lucide-react';
import { useMemo, useState } from 'react';

import { ContentNodeEditor } from '@/components/course-builder/ContentNodeEditor';
import { HtmlNodeEditor } from '@/components/course-builder/HtmlNodeEditor';
import { PdfNodeEditor } from '@/components/course-builder/PdfNodeEditor';
import { NodeTypeSelect } from '@/components/course-builder/NodeTypeSelect';
import { QuestionNodeEditor } from '@/components/course-builder/QuestionNodeEditor';
import { QuizNodeEditor } from '@/components/course-builder/QuizNodeEditor';
import { VideoNodeEditor } from '@/components/course-builder/VideoNodeEditor';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';
import { deriveCoursePremiumState } from '@/src/domain/coursePremium';
import {
  PREMIUM_COURSE_FREE_NODE_LIMIT,
  courseCountsAsPremium,
} from '@/src/domain/creatorCoursePolicy';
import { createDefaultNodePayload } from '@/src/domain/nodePayloads';
import { apiJson } from '@/src/presentation/http/client';
import type {
  ContentNodePayload,
  CourseDetail,
  CourseNode,
  HtmlNodePayload,
  ModuleWithNodes,
  NodeType,
  PdfNodePayload,
  QuestionNodePayload,
  QuizNodePayload,
  VideoNodePayload,
} from '@/src/domain/models';

const nodeTypeCopy: Record<NodeType, { label: string; description: string }> = {
  content: {
    label: 'Content node',
    description: 'Structured lesson sections for intro, detailed explanation, and solved examples.',
  },
  question: {
    label: 'Question node',
    description: 'Multiple solved questions inside one node with markdown or LaTeX support.',
  },
  quiz: {
    label: 'Quiz node',
    description: 'Timed quiz with four options per question and learner scoring support.',
  },
  video: {
    label: 'Video node',
    description: 'Video URL plus notes rendered beneath the embed or link.',
  },
  html: {
    label: 'HTML node',
    description: 'HTML, CSS, and JavaScript authored together with preview compatibility intact.',
  },
  pdf: {
    label: 'PDF node',
    description: 'Upload or link a PDF and let learners read it directly inside the course node.',
  },
  github: {
    label: 'Retired website node',
    description: 'This legacy node type is no longer available. Use HTML, content, video, question, quiz, or PDF nodes instead.',
  },
};

type CreateNodeEditorProps = {
  mode: 'create';
  course: Pick<CourseDetail, 'id' | 'title' | 'description' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'> & {
    freeNodeCount: number;
  };
  module: Pick<ModuleWithNodes, 'id' | 'title' | 'summary'>;
  initialType?: NodeType;
};

type EditNodeEditorProps = {
  mode: 'edit';
  course: Pick<CourseDetail, 'id' | 'title' | 'description' | 'premiumEnabled' | 'priceAmount' | 'premiumAccessDays'> & {
    freeNodeCount: number;
  };
  module: Pick<ModuleWithNodes, 'id' | 'title' | 'summary'>;
  node: CourseNode;
};

function defaultNodeTitle(type: NodeType) {
  return `${type.charAt(0).toUpperCase()}${type.slice(1)} node`;
}

function buildDraftNode(moduleId: string, type: NodeType): CourseNode {
  return {
    id: `draft-${crypto.randomUUID()}`,
    moduleId,
    type,
    title: defaultNodeTitle(type),
    payload: createDefaultNodePayload(type),
    isPremium: false,
    excerpt: null,
    position: 0,
    createdAt: '',
    updatedAt: '',
  };
}

export function NodeEditorLayout(props: CreateNodeEditorProps | EditNodeEditorProps) {
  const router = useRouter();
  const [draft, setDraft] = useState<CourseNode>(
    props.mode === 'edit' ? props.node : buildDraftNode(props.module.id, props.initialType ?? 'content')
  );
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const returnHref = `/creator/courses/${props.course.id}/modules#module-${props.module.id}`;
  const copy = nodeTypeCopy[draft.type];
  const pricingHref = `/creator/courses/${props.course.id}/edit`;
  const coursePremiumState = deriveCoursePremiumState(props.course, draft.isPremium ? 1 : 0);
  const currentNodeCountsAsFree = props.mode === 'edit' && !props.node.isPremium;
  const nodeTypeIsRetired = draft.type === 'github';
  const projectedFreeNodeCount =
    props.course.freeNodeCount - (currentNodeCountsAsFree ? 1 : 0) + (draft.isPremium ? 0 : 1);
  const freeNodePolicyApplies = courseCountsAsPremium(props.course);
  const freeNodePolicyBlocked = freeNodePolicyApplies && projectedFreeNodeCount > PREMIUM_COURSE_FREE_NODE_LIMIT;
  const submitDisabled = saving || freeNodePolicyBlocked || nodeTypeIsRetired;

  function changeNodeType(type: NodeType) {
    if (props.mode === 'edit') {
      return;
    }

    setDraft((current) => {
      const nextDraft = buildDraftNode(props.module.id, type);
      return {
        ...nextDraft,
        title:
          current.title.trim() && current.title !== defaultNodeTitle(current.type)
            ? current.title
            : nextDraft.title,
      };
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      if (props.mode === 'create') {
        await apiJson(`/api/creator/modules/${props.module.id}/nodes`, {
          method: 'POST',
          body: JSON.stringify({
            courseId: props.course.id,
            type: draft.type,
            title: draft.title,
            payload: draft.payload,
            isPremium: draft.isPremium,
            excerpt: draft.excerpt,
          }),
        });
      } else {
        await apiJson(`/api/creator/nodes/${props.node.id}`, {
          method: 'PATCH',
          body: JSON.stringify({
            courseId: props.course.id,
            moduleId: props.module.id,
            type: draft.type,
            title: draft.title,
            payload: draft.payload,
            isPremium: draft.isPremium,
            excerpt: draft.excerpt,
          }),
        });
      }

      router.push(returnHref);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Node save failed.');
    } finally {
      setSaving(false);
    }
  }

  const editor = useMemo(() => {
    switch (draft.type) {
      case 'content':
        return <ContentNodeEditor payload={draft.payload as ContentNodePayload} onChange={(payload) => setDraft({ ...draft, payload })} />;
      case 'question':
        return <QuestionNodeEditor payload={draft.payload as QuestionNodePayload} onChange={(payload) => setDraft({ ...draft, payload })} />;
      case 'quiz':
        return <QuizNodeEditor payload={draft.payload as QuizNodePayload} onChange={(payload) => setDraft({ ...draft, payload })} />;
      case 'video':
        return <VideoNodeEditor payload={draft.payload as VideoNodePayload} onChange={(payload) => setDraft({ ...draft, payload })} />;
      case 'html':
        return <HtmlNodeEditor payload={draft.payload as HtmlNodePayload} onChange={(payload) => setDraft({ ...draft, payload })} />;
      case 'pdf':
        return <PdfNodeEditor payload={draft.payload as PdfNodePayload} onChange={(payload) => setDraft({ ...draft, payload })} />;
      case 'github':
        return (
          <section className="card stack retired-node-notice">
            <div className="section-label">Retired Node Type</div>
            <h3 className="panel-title">This node type is no longer available</h3>
            <p className="muted">
              Create a new supported node and move the lesson content there. New course nodes can be content,
              HTML, question, quiz, video, or PDF.
            </p>
          </section>
        );
    }
  }, [draft]);

  return (
    <form className="node-editor-shell stack-lg" onSubmit={handleSubmit}>
      <section className="studio-form-card stack-lg node-editor-header-card">
        <div className="inline premium-breadcrumbs">
          <Link href="/creator/courses" className="muted-link">
            Creator courses
          </Link>
          <span>/</span>
          <Link href={`/creator/courses/${props.course.id}/modules`} className="muted-link">
            {props.course.title}
          </Link>
          <span>/</span>
          <span>{props.module.title}</span>
        </div>

        <div className="module-card-header">
          <div className="stack" style={{ gap: 12 }}>
            <Link href={returnHref} className="inline muted-link">
              <ArrowLeft size={16} />
              Back to module workspace
            </Link>
            <div className="section-label">Node Authoring</div>
            <h2 className="headline" style={{ fontSize: 'clamp(1.9rem, 3vw, 2.8rem)' }}>
              {props.mode === 'create' ? `Create ${copy.label}` : `Edit ${copy.label}`}
            </h2>
            <p className="subheadline" style={{ marginTop: 0, maxWidth: 760 }}>
              {copy.description}
            </p>
          </div>

          <div className="hero-actions">
            <Button type="submit" disabled={submitDisabled}>
              <Save size={16} />
              {saving ? 'Saving...' : props.mode === 'create' ? 'Create node' : 'Save node'}
            </Button>
            <Link href={returnHref} className="button button-ghost">
              Cancel
            </Link>
          </div>
        </div>

        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">{props.mode === 'create' ? 'New node' : 'Existing node'}</span>
          <span className="studio-badge studio-badge-muted">Course: {props.course.title}</span>
          <span className="studio-badge studio-badge-muted">Module: {props.module.title}</span>
        </div>
      </section>

      <section className="node-editor-main fade-in-panel">
        <section className="studio-form-card stack-lg node-editor-context-card">
          <div className="grid-2 node-editor-top-grid">
            <label className="field">
              <span className="field-label">Node title</span>
              <Input
                value={draft.title}
                onChange={(event) => setDraft({ ...draft, title: event.target.value })}
                placeholder={defaultNodeTitle(draft.type)}
                required
              />
            </label>

            <NodeTypeSelect
              value={draft.type}
              disabled={props.mode === 'edit'}
              onChange={(type) => changeNodeType(type)}
            />
          </div>

          <div className="grid-2 node-editor-top-grid">
            <div className="card stack" style={{ gap: 10 }}>
              <div className="field-label">Current node type</div>
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">{copy.label}</span>
                <span className="studio-badge studio-badge-muted">
                  <Sparkles size={14} />
                  Each editor keeps its preview directly below the input surface for consistent authoring
                </span>
              </div>
              <p className="muted" style={{ margin: 0 }}>{copy.description}</p>
            </div>

            <div className="card stack" style={{ gap: 10 }}>
              <div className="field-label">Module context</div>
              <h3 className="panel-title" style={{ margin: 0, fontSize: '1.1rem' }}>{props.module.title}</h3>
              <p className="muted" style={{ margin: 0 }}>{props.module.summary}</p>
            </div>
          </div>

          <div className="grid-2 node-editor-top-grid">
            <label className="field card stack" style={{ gap: 12 }}>
              <span className="field-label">Tree excerpt</span>
              <TextArea
                value={draft.excerpt ?? ''}
                onChange={(event) => setDraft({ ...draft, excerpt: event.target.value })}
                placeholder="Safe preview text for course tree and search results."
              />
              <span className="muted">Visible in tree/search without exposing premium payload.</span>
            </label>

            <label className="field card stack" style={{ gap: 12 }}>
              <span className="field-label">Premium access</span>
              <label className="inline" style={{ alignItems: 'center', gap: 10 }}>
                <input
                  type="checkbox"
                  checked={draft.isPremium}
                  onChange={(event) => setDraft({ ...draft, isPremium: event.target.checked })}
                />
                <span>Require the course premium plan for this node</span>
              </label>
              <span className="muted">
                {coursePremiumState === 'premium_ready'
                  ? `Premium nodes stay visible in the tree and use the active course plan (${props.course.priceAmount} for ${props.course.premiumAccessDays} days).`
                  : 'You can mark nodes premium now, but the course needs a valid premium price and duration before premium content can be published or sold.'}
              </span>
              <div className="inline premium-badge-row">
                <span className={`studio-badge ${freeNodePolicyBlocked ? 'studio-badge-warning' : 'studio-badge-muted'}`}>
                  Free nodes after save: {projectedFreeNodeCount}/{PREMIUM_COURSE_FREE_NODE_LIMIT}
                </span>
                <span className="studio-badge studio-badge-muted">
                  Premium course policy
                </span>
              </div>
              {freeNodePolicyBlocked ? (
                <div className="studio-inline-alert">
                  Premium courses can expose at most {PREMIUM_COURSE_FREE_NODE_LIMIT} free nodes. Mark this node premium, or convert another free node to premium first.
                </div>
              ) : null}
              {coursePremiumState === 'pricing_incomplete' ? (
                <Link href={pricingHref} className="button button-secondary">
                  Complete pricing
                </Link>
              ) : null}
            </label>
          </div>
        </section>

        <section className="node-editor-stage stack-lg fade-in-panel">
          {editor}
        </section>
      </section>

      {nodeTypeIsRetired ? (
        <div className="studio-inline-alert">
          This retired node type cannot be saved. Create a supported replacement node to publish this lesson.
        </div>
      ) : null}
      {error ? <div className="studio-inline-alert">{error}</div> : null}

      <div className="inline">
        <Button type="submit" disabled={submitDisabled}>
          <Save size={16} />
          {saving ? 'Saving...' : props.mode === 'create' ? 'Create node' : 'Save node'}
        </Button>
        <Link href={returnHref} className="button button-secondary">
          Cancel
        </Link>
      </div>
    </form>
  );
}
