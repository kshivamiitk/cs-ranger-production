import Link from 'next/link';
import { BookOpen, CalendarClock } from 'lucide-react';

import type {
  CatalogCourseWorkspaceView,
  CreatorFollowState,
  PublicUserSummary,
} from '@/src/domain/models';
import { CreatorProfileCard } from '@/components/creators/CreatorProfileCard';
import { CourseModuleNavigator } from '@/components/learner/CourseModuleNavigator';
import { PremiumAccessButton } from '@/components/learner/PremiumAccessButton';
import { CourseAccessStatusCard } from '@/components/learner/CourseAccessStatusCard';
import { formatDateTimeLabel } from '@/lib/utils';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';

export function LearnerCourseWorkspace(props: {
  view: CatalogCourseWorkspaceView;
  creatorStrip?: {
    creator: PublicUserSummary;
    follow: CreatorFollowState;
    viewerUserId: string | null;
  } | null;
}) {
  const { course, overview, access, activeModule, activeNodeSummary, progress } = props.view;
  const premium = describeCoursePremiumState(course, overview.premiumNodeCount);
  const normalizedTitle = course.title.trim().toLowerCase();
  const normalizedDescription = course.description.trim().toLowerCase();
  const courseSummary =
    normalizedDescription.length > 0 && normalizedDescription !== normalizedTitle
      ? course.description
      : null;
  const entitlementLabel = access.activeEntitlement
    ? formatDateTimeLabel(access.activeEntitlement.expiresAt)
    : null;
  const renewalMessage = access.canRenewPremium && entitlementLabel ? 'Renew before this date to extend access.' : null;
  const courseNodes = course.modules.flatMap((module) => module.nodes);
  const progressPercent = Math.min(100, Math.max(0, progress?.completionPercent ?? 0));
  const roadmapStartNode = courseNodes.find((node) => !node.isLocked) ?? courseNodes[0] ?? null;
  const readerTargetNode = progress?.continueLearning
    ? {
        id: progress.continueLearning.nodeId,
        title: progress.continueLearning.nodeTitle,
        intent: 'continue',
      }
    : activeNodeSummary
      ? {
          id: activeNodeSummary.id,
          title: activeNodeSummary.title,
          intent: 'reader',
        }
      : roadmapStartNode
        ? {
            id: roadmapStartNode.id,
            title: roadmapStartNode.title,
            intent: 'start',
          }
        : null;
  const courseStatusBadge = access.activeEntitlement
    ? {
        className: 'studio-badge-success',
        label: 'Unlocked',
      }
    : {
        className:
          premium.tone === 'primary'
            ? 'studio-badge-primary'
          : premium.tone === 'warning'
            ? 'studio-badge-warning'
            : 'studio-badge-success',
        label: premium.label,
      };
  const hasPremiumAction =
    premium.state === 'premium_ready' &&
    (access.canPurchasePremium || access.canRenewPremium || access.gateReason === 'login_required');
  const shouldShowSummaryActions = hasPremiumAction || Boolean(readerTargetNode) || Boolean(progress?.lastVisited);

  return (
    <section className="learner-course-workspace stack-lg">
      <section className="learner-course-layout learner-course-layout-tree learner-course-layout-tree-v226" id="course-workspace">
        <div className="learner-course-tree-panel learner-course-tree-panel-v226">
          <div className="course-workspace-summary-stack course-workspace-summary-stack-v226">
            <div className="v226-course-cockpit-hero">
              <div className="v226-course-cockpit-copy">
                <h2>{course.title}</h2>
                <p>Browse the module tree like a code workspace, then open every node in the dedicated reader for a distraction-free study flow.</p>
              </div>
              <aside className="v226-course-cockpit-card">
                <span className="v226-cockpit-number">{progress?.completionPercent ?? 0}%</span>
                <span className="muted">completed</span>
                <progress className="v226-course-progress-track" max={100} value={progressPercent}>
                  {progressPercent}%
                </progress>
                <strong>{activeNodeSummary?.title ?? progress?.continueLearning?.nodeTitle ?? 'Choose your next node'}</strong>
              </aside>
            </div>

            <div className="inline premium-badge-row course-hero-badges course-hero-badges-v226">
              <span className="studio-badge studio-badge-primary">
                <BookOpen size={14} />
                Learning workspace
              </span>
              <span className="studio-badge studio-badge-muted">
                {overview.moduleCount} module{overview.moduleCount === 1 ? '' : 's'}
              </span>
              <span className="studio-badge studio-badge-muted">
                {overview.nodeCount} node{overview.nodeCount === 1 ? '' : 's'}
              </span>
              <span className={`studio-badge ${courseStatusBadge.className}`}>{courseStatusBadge.label}</span>
              {access.activeEntitlement && entitlementLabel ? (
                <span className="studio-badge studio-badge-success">
                  <CalendarClock size={14} />
                  Expires by: {entitlementLabel}
                </span>
              ) : null}
              {progress && progress.accessibleNodeCount > 0 ? (
                <span className="studio-badge studio-badge-primary">
                  {progress.completionPercent}% complete · {progress.completedNodeCount}/{progress.accessibleNodeCount}
                </span>
              ) : null}
            </div>

            {courseSummary ? (
              <p className="muted course-workspace-summary-copy flush">
                {courseSummary}
              </p>
            ) : null}

            {shouldShowSummaryActions ? (
              <div className="inline premium-badge-row course-workspace-summary-actions">
                {premium.state === 'premium_ready' ? (
                  access.canPurchasePremium ? (
                    <PremiumAccessButton courseId={course.id} baseAccessDays={course.premiumAccessDays} label="Unlock Premium Nodes" />
                  ) : access.canRenewPremium ? (
                    <PremiumAccessButton courseId={course.id} baseAccessDays={course.premiumAccessDays} label="Renew Premium Access" />
                  ) : access.gateReason === 'login_required' ? (
                    <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}`)}`} className="button">
                      Log in to unlock premium nodes
                    </Link>
                  ) : null
                ) : null}
                {readerTargetNode ? (
                  <Link
                    href={`/courses/${course.id}/nodes/${readerTargetNode.id}`}
                    className="button button-secondary"
                    aria-label={`Open ${readerTargetNode.title} in reader mode`}
                  >
                    {readerTargetNode.intent === 'continue'
                      ? 'Continue learning'
                      : readerTargetNode.intent === 'reader'
                        ? 'Reader mode'
                        : 'Start course'}
                  </Link>
                ) : null}
                {progress?.lastVisited ? (
                  <span className="tag">
                    Last visited: {progress.lastVisited.nodeTitle}
                  </span>
                ) : null}
              </div>
            ) : null}

            {renewalMessage ? <p className="course-hero-renewal-note">{renewalMessage}</p> : null}

            <CourseAccessStatusCard view={props.view} />

            {props.creatorStrip ? (
              <CreatorProfileCard
                creator={props.creatorStrip.creator}
                follow={props.creatorStrip.follow}
                viewerUserId={props.creatorStrip.viewerUserId}
                eyebrow="Created by"
                compact
                showBio
              />
            ) : null}

            {premium.state === 'pricing_incomplete' && access.isOwner ? (
              <div className="studio-inline-alert">
                Premium nodes exist, but pricing is incomplete. Finish pricing before publishing or selling access.
              </div>
            ) : null}
          </div>

          <CourseModuleNavigator
            courseId={course.id}
            modules={course.modules}
            activeModuleId={activeModule?.id ?? null}
            activeNodeId={activeNodeSummary?.id ?? null}
            variant="roadmap"
          />
        </div>
      </section>
    </section>
  );
}
