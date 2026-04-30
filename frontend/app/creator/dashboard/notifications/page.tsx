import Link from 'next/link';
import { Bell, BookOpen, Handshake, Layers, Radio } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { IncomingCollaborationRequestsPanel } from '@/components/creator/IncomingCollaborationRequestsPanel';
import { StatCard } from '@/components/ui/StatCard';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateTimeLabel } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';
import { listBroadcastsForViewer } from '@/src/server/adminBroadcasts';

export default async function CreatorNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { courseBuilderService, creatorLearnerDoubtQueryService, courseCollaborationService }] = await Promise.all([
    requireServerCreator('/creator/dashboard/notifications'),
    createServerContainer(),
  ]);
  const [courses, doubts, invites, broadcasts] = await Promise.all([
    courseBuilderService.listCreatorCourses(viewer),
    creatorLearnerDoubtQueryService.listCreatorLearnerDoubts(viewer),
    courseCollaborationService.listIncomingInvites(viewer),
    listBroadcastsForViewer(viewer),
  ]);

  const events = [
    ...broadcasts.map((broadcast) => ({
      id: `broadcast-${broadcast.id}`,
      kind: 'broadcast',
      title: broadcast.title,
      description: broadcast.body,
      href: broadcast.ctaHref ?? '/creator/dashboard/notifications',
      occurredAt: broadcast.updatedAt,
    })),
    ...courses.map((course) => ({
      id: `course-${course.id}`,
      kind: course.status === 'published' ? 'course_published' : 'course_updated',
      title: `${course.title} is ${course.status}`,
      description: `Course studio activity for ${course.title}. Premium node count: ${course.premiumNodeCount}.`,
      href: `/creator/courses/${course.id}/modules`,
      occurredAt: course.updatedAt,
    })),
    ...invites.map((invite) => ({
      id: `invite-${invite.id}`,
      kind: 'collaboration_request',
      title: `Collaboration request for ${invite.courseTitle ?? 'Untitled course'}`,
      description: `Invited by ${invite.inviter?.fullName ?? 'Creator'}${invite.inviter?.username ? ` (@${invite.inviter.username})` : ''}.`,
      href: '/creator/courses',
      occurredAt: invite.createdAt,
    })),
    ...doubts.map((doubt) => ({
      id: `doubt-${doubt.commentId}`,
      kind: 'learner_doubt',
      title: `${doubt.learnerName ?? 'Learner'} posted a new doubt`,
      description: `${doubt.courseTitle} · ${doubt.nodeTitle}`,
      href: `/courses/${doubt.courseId}/nodes/${doubt.nodeId}#discussion-comment-${doubt.commentId}`,
      occurredAt: doubt.lastActivityAt,
    })),
  ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedEvents = paginateList(events, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Creator Studio"
      title="Notifications"
      subtitle="A compact creator event inbox for course updates, collaboration, broadcasts, and learner activity."
    >
      <section className="stat-grid">
        <StatCard label="Creator alerts" value={String(events.length)} icon={<Bell size={18} />} />
        <StatCard label="Course activity" value={String(courses.length)} icon={<BookOpen size={18} />} />
        <StatCard label="Open learner doubts" value={String(doubts.length)} icon={<Layers size={18} />} />
        <StatCard label="Collab requests" value={String(invites.length)} icon={<Handshake size={18} />} />
        <StatCard label="Broadcasts" value={String(broadcasts.length)} icon={<Radio size={18} />} />
      </section>

      {invites.length > 0 ? <IncomingCollaborationRequestsPanel invites={invites} /> : null}

      <section className="panel stack-lg">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Creator activity inbox</h2>
            <p className="muted">This bell-driven page gathers broadcasts, course updates, collaboration requests, and learner doubts into one operational timeline.</p>
          </div>
          <Link href="/creator/courses" className="button button-secondary">
            Open course studio
          </Link>
        </div>

        <ListPaginationControls
          pathname="/creator/dashboard/notifications"
          searchParams={resolvedSearchParams}
          page={pagedEvents.page}
          size={pagedEvents.size}
          totalItems={pagedEvents.totalItems}
          totalPages={pagedEvents.totalPages}
          startIndex={pagedEvents.startIndex}
          endIndex={pagedEvents.endIndex}
          noun="alerts"
        />

        {events.length === 0 ? (
          <div className="empty-state">No creator notifications yet.</div>
        ) : (
          <div className="editorial-list">
            {pagedEvents.items.map((event) => (
              <Link key={event.id} href={event.href} className="editorial-list-item editorial-list-item-feed">
                <div className="notifications-meta-row">
                  <span className="studio-badge studio-badge-primary">{event.kind.replaceAll('_', ' ')}</span>
                  <span className="studio-badge studio-badge-muted">{formatDateTimeLabel(event.occurredAt)}</span>
                </div>
                <h3 className="panel-title text-no-margin">{event.title}</h3>
                <p className="muted text-no-margin">{event.description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}


