import Link from 'next/link';
import { BookOpen, Handshake, Layers3, Sparkles } from 'lucide-react';

import { ContributionHeatmap, type ContributionDay } from '@/components/analytics/ContributionHeatmap';
import { CreatorStudioShell } from '@/components/creator/CreatorStudioShell';
import { IncomingCollaborationRequestsPanel } from '@/components/creator/IncomingCollaborationRequestsPanel';
import { StatCard } from '@/components/ui/StatCard';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateTimeLabel } from '@/lib/utils';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { requireServerCreatorPageContext } from '@/src/presentation/serverPage';
import { getSupportUnreadCountForViewer, listSupportThreadsForViewer } from '@/src/server/adminSupport';

async function buildCreatorHeatmap(courseIds: string[]): Promise<ContributionDay[]> {
  const supabase = createServiceRoleSupabaseClient();
  const daysBack = 126;
  const today = new Date();
  const start = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), today.getUTCDate() - (daysBack - 1)));

  if (courseIds.length === 0) {
    return Array.from({ length: daysBack }, (_, offset) => {
      const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset));
      return { date: date.toISOString(), nodesCompletedCount: 0, quizAttemptsCount: 0, contributionScore: 0 };
    });
  }

  const [{ data: moduleRows, error: moduleError }] = await Promise.all([
    supabase.from('course_modules').select('id, updated_at').in('course_id', courseIds).gte('updated_at', start.toISOString()),
  ]);

  if (moduleError) throw moduleError;
  const moduleIds = (moduleRows ?? []).map((row: any) => row.id);
  const { data: nodeRows, error: nodeError } = moduleIds.length
    ? await supabase.from('course_nodes').select('updated_at').in('module_id', moduleIds).gte('updated_at', start.toISOString())
    : { data: [], error: null as any };

  if (nodeError) throw nodeError;

  const counts = new Map<string, number>();
  for (const row of nodeRows ?? []) {
    const key = String((row as any).updated_at).slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  for (const row of moduleRows ?? []) {
    const key = String((row as any).updated_at).slice(0, 10);
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  const days: ContributionDay[] = [];
  for (let offset = 0; offset < daysBack; offset += 1) {
    const date = new Date(Date.UTC(start.getUTCFullYear(), start.getUTCMonth(), start.getUTCDate() + offset));
    const key = date.toISOString().slice(0, 10);
    const score = counts.get(key) ?? 0;
    days.push({
      date: date.toISOString(),
      nodesCompletedCount: score,
      quizAttemptsCount: 0,
      contributionScore: score,
    });
  }

  return days;
}

export default async function CreatorDashboardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { viewer, themeMode, container } = await requireServerCreatorPageContext('/creator/dashboard');
  const { courseBuilderService, courseCollaborationService } = container;

  const [courses, supportThreads, invites] = await Promise.all([
    courseBuilderService.listCreatorCourses(viewer),
    listSupportThreadsForViewer(viewer),
    courseCollaborationService.listIncomingInvites(viewer),
  ]);
  const heatmap = await buildCreatorHeatmap(courses.map((course) => course.id));

  const ownedCourses = courses.filter((course) => course.ownershipType !== 'collaborator');
  const collaboratingCourses = courses.filter((course) => course.ownershipType === 'collaborator');
  const totalModules = courses.reduce((sum, course) => sum + course.moduleCount, 0);
  const publishedCount = courses.filter((course) => course.status === 'published').length;

  const pagination = resolveListPagination(resolvedSearchParams);
  const sortedCourses = [...courses].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime());
  const pagedCourses = paginateList(sortedCourses, pagination.page, pagination.size);
  const unreadSupportCount = getSupportUnreadCountForViewer(viewer, supportThreads);

  return (
    <CreatorStudioShell
      viewer={viewer}
      themeMode={themeMode}
      title="Overview"
      subtitle="One focused creator home: contribution heatmap first, then the courses you were editing most recently."
      actions={
        <Link href="/creator/courses/new" className="button">
          Create course
        </Link>
      }
      unreadCounts={{ support: unreadSupportCount, notifications: 0 }}
    >
      <div className="stack-lg">
        <IncomingCollaborationRequestsPanel invites={invites} />

        <section className="stat-grid">
          <StatCard label="Owned courses" value={String(ownedCourses.length)} icon={<BookOpen size={18} />} />
          <StatCard label="Collaborating" value={String(collaboratingCourses.length)} icon={<Handshake size={18} />} />
          <StatCard label="Published" value={String(publishedCount)} icon={<Sparkles size={18} />} />
          <StatCard label="Modules" value={String(totalModules)} icon={<Layers3 size={18} />} />
          <StatCard label="Pending invites" value={String(invites.length)} icon={<Handshake size={18} />} />
        </section>
        <ContributionHeatmap
          title="Creator activity heatmap"
          description="Nodes and modules you edited over time. This keeps the creator home calm and progress-shaped instead of finance-heavy."
          days={heatmap}
        />

        <section className="panel stack-lg v12-continue-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" style={{ margin: 0 }}>Continue editing</h2>
              <p className="muted" style={{ marginTop: 8 }}>Open the exact course you touched most recently and continue from there.</p>
            </div>
            <Link href="/creator/courses" className="button button-secondary">
              Open course studio
            </Link>
          </div>

          <ListPaginationControls
            pathname="/creator/dashboard"
            searchParams={resolvedSearchParams}
            page={pagedCourses.page}
            size={pagedCourses.size}
            totalItems={pagedCourses.totalItems}
            totalPages={pagedCourses.totalPages}
            startIndex={pagedCourses.startIndex}
            endIndex={pagedCourses.endIndex}
            noun="courses"
          />

          {sortedCourses.length === 0 ? (
            <div className="empty-state">No creator courses yet. Create your first course and it will appear here.</div>
          ) : (
            <div className="v12-continue-list">
              {pagedCourses.items.map((course) => (
                <article key={course.id} className="v12-continue-row">
                  <div className="v12-continue-media">
                    {course.imageUrl ? <img src={course.imageUrl} alt={course.title} className="v12-continue-image" /> : <div className="v12-continue-image v12-continue-image-fallback">CS</div>}
                  </div>
                  <div className="v12-continue-copy">
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-primary">{course.status}</span>
                      <span className={`studio-badge ${course.ownershipType === 'collaborator' ? 'studio-badge-warning' : 'studio-badge-success'}`}>{course.ownershipType === 'collaborator' ? 'Collaborating' : 'Owned'}</span>
                      {course.premiumEnabled ? <span className="studio-badge studio-badge-muted">Premium</span> : <span className="studio-badge studio-badge-success">Free</span>}
                    </div>
                    <h3 className="panel-title" style={{ margin: 0 }}>{course.title}</h3>
                    <p className="muted" style={{ margin: 0 }}>{course.description}</p>
                  </div>
                  <div className="v12-continue-meta">
                    <span className="muted">Updated {formatDateTimeLabel(course.updatedAt)}</span>
                    <div className="inline" style={{ gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                      {course.ownershipType !== 'collaborator' ? (
                        <Link href={`/creator/courses/${course.id}/account`} className="button button-ghost">
                          Course account
                        </Link>
                      ) : null}
                      <Link href={`/creator/courses/${course.id}/modules`} className="button button-secondary">
                        Modules
                      </Link>
                      <Link href={`/creator/courses/${course.id}`} className="button">
                        Continue editing
                      </Link>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      </div>
    </CreatorStudioShell>
  );
}

