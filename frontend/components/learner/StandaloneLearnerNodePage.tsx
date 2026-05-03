import Link from 'next/link';
import { ArrowLeft, ChevronLeft, ChevronRight, Crown, LockKeyhole } from 'lucide-react';

import {
  defaultContentSectionKey,
  getContentSectionByKey,
  type ContentSectionKey,
} from '@/src/domain/contentSections';
import type { CatalogCourseNodeView, CourseNode, PdfNodePayload } from '@/src/domain/models';
import { ContentNodeSectionNav } from '@/components/learner/ContentNodeSectionNav';
import { NodeBookmarkButton } from '@/components/learner/NodeBookmarkButton';
import { NodeProgressActions } from '@/components/learner/NodeProgressActions';
import { PremiumAccessButton } from '@/components/learner/PremiumAccessButton';
import { LearnerNodeStage } from '@/components/learner/LearnerNodeStage';
import { NodeTypeBadge } from '@/components/learner/NodeTypeBadge';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';

function nodeHref(courseId: string, nodeId: string) {
  return `/courses/${courseId}/nodes/${nodeId}`;
}

function protectPdfNodePayload(courseId: string, node: CourseNode) {
  if (node.type !== 'pdf') {
    return node;
  }

  return {
    ...node,
    payload: {
      ...(node.payload as PdfNodePayload),
      pdfUrl: `/api/courses/${courseId}/nodes/${node.id}/pdf`,
    },
  } satisfies CourseNode;
}

export function StandaloneLearnerNodePage(props: {
  courseView: CatalogCourseNodeView;
  interactiveQuiz: boolean;
  contentSectionKey?: ContentSectionKey | null;
  initialBookmarked: boolean;
  bookmarkEnabled: boolean;
}) {
  const { course, access, module, nodeSummary, node, previousNode, nextNode } = props.courseView;
  const protectedNode = node ? protectPdfNodePayload(course.id, node) : null;
  const premium = describeCoursePremiumState(course, props.courseView.overview.premiumNodeCount);
  const backHref = module ? `/courses/${course.id}#module-${module.id}` : `/courses/${course.id}`;
  const loginHref = `/login?next=${encodeURIComponent(`/courses/${course.id}/nodes/${nodeSummary?.id ?? ''}`)}`;
  const activeContentSection =
    protectedNode?.type === 'content'
      ? getContentSectionByKey(props.contentSectionKey ?? defaultContentSectionKey)
      : null;
  const htmlNavigation = {
    previousHref: previousNode ? nodeHref(course.id, previousNode.id) : null,
    nextHref: nextNode ? nodeHref(course.id, nextNode.id) : null,
    courseHref: backHref,
  };
  const progressUnavailableLabel = props.bookmarkEnabled
    ? 'Progress tracking is unavailable for this account.'
    : 'Log in as a learner to mark complete.';

  if (!module || !nodeSummary) {
    return (
      <section className="reader-locked-state fade-in-panel">
        <div className="stack" style={{ gap: 10 }}>
          <h2 className="panel-title" style={{ margin: 0 }}>This node could not be found.</h2>
          <p className="muted" style={{ margin: 0 }}>Return to the course tree and open another node.</p>
        </div>
        <Link href={backHref} className="button button-secondary">
          <ArrowLeft size={16} />
          Back to tree
        </Link>
      </section>
    );
  }

  if (props.courseView.nodeLocked || !protectedNode) {
    return (
      <section className="reader-locked-state fade-in-panel">
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-muted">
            <LockKeyhole size={14} />
            Premium node locked
          </span>
          <span className={`studio-badge ${premium.tone === 'warning' ? 'studio-badge-warning' : 'studio-badge-primary'}`}>
            <Crown size={14} />
            {premium.label}
          </span>
        </div>
        <div className="stack" style={{ gap: 10 }}>
          <div className="inline premium-badge-row">
            <NodeTypeBadge type={nodeSummary.type} size="sm" />
            <span className="studio-badge studio-badge-muted">{module.title}</span>
          </div>
          <h2 className="panel-title" style={{ margin: 0 }}>{nodeSummary.title}</h2>
          <p className="muted" style={{ margin: 0, maxWidth: 620 }}>
            {access.gateMessage ?? 'This premium node is visible in the tree, but full payload access requires an active premium entitlement.'}
          </p>
          {nodeSummary.excerpt ? <p className="muted" style={{ margin: 0 }}>{nodeSummary.excerpt}</p> : null}
        </div>
        <div className="inline premium-badge-row">
          <Link href={backHref} className="button button-secondary">
            <ArrowLeft size={16} />
            Back to tree
          </Link>
          {access.canPurchasePremium ? (
            <PremiumAccessButton courseId={course.id} baseAccessDays={course.premiumAccessDays} label="Unlock Premium Nodes" />
          ) : access.canRenewPremium ? (
            <PremiumAccessButton courseId={course.id} baseAccessDays={course.premiumAccessDays} label="Renew Premium Access" />
          ) : premium.state === 'pricing_incomplete' && access.isOwner ? (
            <Link href={`/creator/courses/${course.id}/edit`} className="button">
              Complete pricing
            </Link>
          ) : access.gateReason === 'login_required' ? (
            <Link href={loginHref} className="button">
              Log in to unlock
            </Link>
          ) : null}
        </div>
      </section>
    );
  }

  return (
    <section className="standalone-node-page stack-lg">
      <header className="standalone-node-toolbar fade-in-panel">
        <Link href={backHref} className="inline muted-link">
          <ArrowLeft size={16} />
          Back to course
        </Link>

        <div className="standalone-node-nav">
          {previousNode ? (
            <Link href={nodeHref(course.id, previousNode.id)} className="button button-ghost">
              <ChevronLeft size={16} />
              Previous
            </Link>
          ) : (
            <span className="button button-ghost" aria-disabled="true">
              <ChevronLeft size={16} />
              Previous
            </span>
          )}
          {nextNode ? (
            <Link href={nodeHref(course.id, nextNode.id)} className="button button-secondary">
              Next
              <ChevronRight size={16} />
            </Link>
          ) : (
            <span className="button button-secondary" aria-disabled="true">
              Next
              <ChevronRight size={16} />
            </span>
          )}
        </div>
      </header>

      <LearnerNodeStage
        courseId={course.id}
        courseTitle={course.title}
        moduleTitle={module.title}
        node={protectedNode}
        interactiveQuiz={props.interactiveQuiz}
        contentSectionKey={activeContentSection?.key ?? null}
        htmlNavigation={htmlNavigation}
        progressEnabled={Boolean(props.courseView.progress)}
        actions={
          <>
            {activeContentSection ? (
              <ContentNodeSectionNav
                courseId={course.id}
                nodeId={protectedNode.id}
                activeSectionKey={activeContentSection.key}
              />
            ) : null}
            <NodeProgressActions
              courseId={course.id}
              nodeId={protectedNode.id}
              initialCompleted={props.courseView.nodeCompleted}
              enabled={Boolean(props.courseView.progress)}
              unavailableLabel={progressUnavailableLabel}
            />
            <NodeBookmarkButton
              courseId={course.id}
              nodeId={protectedNode.id}
              initialBookmarked={props.initialBookmarked}
              enabled={props.bookmarkEnabled}
            />
          </>
        }
      />
    </section>
  );
}
