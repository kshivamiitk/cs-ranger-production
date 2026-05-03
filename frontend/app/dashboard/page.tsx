import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { ContributionHeatmap, type ContributionDay } from '@/components/analytics/ContributionHeatmap';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateTimeLabel } from '@/lib/utils';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { requireServerPageContext } from '@/src/presentation/serverPage';
import { getSupportUnreadCountForViewerFast } from '@/src/server/adminSupport';

function startOfDayIso(date: Date) {
  const next = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  return next.toISOString();
}

async function buildLearnerHeatmap(learnerUserId: string): Promise<ContributionDay[]> {
  const supabase = createServiceRoleSupabaseClient();
  const daysBack = 126;
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (daysBack - 1)));

  const [{ data: nodeRows, error: nodeError }, { data: quizRows, error: quizError }] = await Promise.all([
    supabase
      .from('learner_node_progress')
      .select('completed_at')
      .eq('learner_user_id', learnerUserId)
      .gte('completed_at', start.toISOString()),
    supabase
      .from('quiz_attempts')
      .select('submitted_at')
      .eq('learner_user_id', learnerUserId)
      .gte('submitted_at', start.toISOString()),
  ]);

  if (nodeError) throw nodeError;
  if (quizError) throw quizError;

  const nodeCounts = new Map<string, number>();
  for (const row of nodeRows ?? []) {
    const key = String((row as any).completed_at).slice(0, 10);
    nodeCounts.set(key, (nodeCounts.get(key) ?? 0) + 1);
  }

  const quizCounts = new Map<string, number>();
  for (const row of quizRows ?? []) {
    const key = String((row as any).submitted_at).slice(0, 10);
    quizCounts.set(key, (quizCounts.get(key) ?? 0) + 1);
  }

  const days: ContributionDay[] = [];
  for (let offset = 0; offset < daysBack; offset += 1) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset));
    const key = date.toISOString().slice(0, 10);
    const nodesCompletedCount = nodeCounts.get(key) ?? 0;
    const quizAttemptsCount = quizCounts.get(key) ?? 0;
    days.push({
      date: startOfDayIso(date),
      nodesCompletedCount,
      quizAttemptsCount,
      contributionScore: nodesCompletedCount + quizAttemptsCount,
    });
  }

  return days;
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { viewer, themeMode, container } = await requireServerPageContext('/dashboard');
  const { learnerDashboardService } = container;

  const [dashboard, heatmap, unreadSupportCount] = await Promise.all([
    learnerDashboardService.getDashboard(viewer, { includeFeed: false }),
    buildLearnerHeatmap(viewer.user.id),
    getSupportUnreadCountForViewerFast(viewer),
  ]);

  const continueCourses = [...dashboard.catalogCourses]
    .filter((course) => course.progress?.continueLearning)
    .sort((left, right) => {
      const leftVisited = left.progress?.lastVisited?.nodeId ? left.progress?.lastVisited : null;
      const rightVisited = right.progress?.lastVisited?.nodeId ? right.progress?.lastVisited : null;
      const leftDate = leftVisited ? (left.progress?.lastVisited as any)?.visitedAt ?? left.updatedAt : left.updatedAt;
      const rightDate = rightVisited ? (right.progress?.lastVisited as any)?.visitedAt ?? right.updatedAt : right.updatedAt;
      return new Date(String(rightDate)).getTime() - new Date(String(leftDate)).getTime();
    });

  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedContinue = paginateList(continueCourses, pagination.page, pagination.size);
  const unreadFeedCount = 0;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Learner Dashboard"
      subtitle="One calm learner home: contribution history first, then your exact continue-learning queue."
      unreadCounts={{ feed: unreadFeedCount, support: unreadSupportCount, notifications: 0 }}
      actions={
        <div className="hero-actions-inline">
          {viewer.profile.primaryRole === 'creator' ? (
            <Link href="/creator/dashboard" className="button">
              Open creator dashboard
            </Link>
          ) : null}
          {viewer.profile.isAdmin ? (
            <Link href="/admin" className="button button-secondary">
              Open admin console
            </Link>
          ) : null}
        </div>
      }
    >
      <div className="stack-lg">
        <ContributionHeatmap
          title="Contribution heatmap"
          description="Every completed node and submitted quiz adds to your daily learning contribution, so the dashboard feels like a real study graph rather than a pile of widgets."
          days={heatmap}
        />

        <section className="panel stack-lg v12-continue-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" style={{ margin: 0 }}>Continue learning</h2>
              <p className="muted" style={{ marginTop: 8 }}>
                Jump directly back to the last node you touched in each active course.
              </p>
            </div>
            <Link href="/courses" className="button button-secondary">
              Open catalog
            </Link>
          </div>

          <ListPaginationControls
            pathname="/dashboard"
            searchParams={resolvedSearchParams}
            page={pagedContinue.page}
            size={pagedContinue.size}
            totalItems={pagedContinue.totalItems}
            totalPages={pagedContinue.totalPages}
            startIndex={pagedContinue.startIndex}
            endIndex={pagedContinue.endIndex}
            noun="courses"
          />

          {continueCourses.length === 0 ? (
            <div className="empty-state">No in-progress courses yet. Start a course and your exact return point will appear here.</div>
          ) : (
            <div className="v12-continue-list">
              {pagedContinue.items.map((course) => {
                const continueTarget = course.progress?.continueLearning;
                const lastVisited = course.progress?.lastVisited;
                const continueHref = continueTarget
                  ? continueTarget.nodeType === 'quiz'
                    ? `/courses/${course.id}/nodes/${continueTarget.nodeId}/quiz`
                    : `/courses/${course.id}/nodes/${continueTarget.nodeId}`
                  : `/courses/${course.id}`;

                return (
                  <article key={course.id} className="v12-continue-row">
                    <div className="v12-continue-media">
                      {course.imageUrl ? <img src={course.imageUrl} alt={course.title} className="v12-continue-image" /> : <div className="v12-continue-image v12-continue-image-fallback">CS</div>}
                    </div>
                    <div className="v12-continue-copy">
                      <div className="inline premium-badge-row">
                        <span className="studio-badge studio-badge-primary">{course.progress?.completionPercent ?? 0}% complete</span>
                        {course.domainName ? <span className="studio-badge studio-badge-muted">{course.domainName}</span> : null}
                      </div>
                      <h3 className="panel-title" style={{ margin: 0 }}>{course.title}</h3>
                      <p className="muted" style={{ margin: 0 }}>
                        by {course.creatorName ?? 'Unknown creator'} · {course.moduleCount} modules · {course.nodeCount} nodes
                      </p>
                      <p className="muted" style={{ margin: 0 }}>
                        Last visited: {lastVisited ? `${lastVisited.moduleTitle} → ${lastVisited.nodeTitle}` : 'Start from the first unlocked node.'}
                      </p>
                    </div>
                    <div className="v12-continue-meta">
                      <span className="muted">{lastVisited ? formatDateTimeLabel((lastVisited as any).visitedAt ?? course.updatedAt) : formatDateTimeLabel(course.updatedAt)}</span>
                      <Link href={continueHref} className="button">
                        Continue learning
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}
