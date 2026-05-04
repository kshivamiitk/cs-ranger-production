import Link from 'next/link';
import { Bell, Radio, Rss, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateTimeLabel } from '@/lib/utils';
import { requireServerPageContext } from '@/src/presentation/serverPage';
import { getSupportUnreadCountForViewerFast } from '@/src/server/adminSupport';
import { getFeedUnreadCountForViewer } from '@/src/server/feedSeen';
import { listBroadcastsForViewer } from '@/src/server/adminBroadcasts';

export default async function LearnerNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { viewer, themeMode, container } = await requireServerPageContext('/dashboard/notifications');
  const { learnerDashboardService } = container;
  const [feed, supportUnreadCount, broadcasts] = await Promise.all([
    learnerDashboardService.getFeed(viewer),
    getSupportUnreadCountForViewerFast(viewer),
    listBroadcastsForViewer(viewer),
  ]);

  const events = [
    ...broadcasts.map((broadcast) => ({
      id: `broadcast-${broadcast.id}`,
      kind: 'broadcast',
      summary: broadcast.title,
      description: broadcast.body,
      href: broadcast.ctaHref ?? '/dashboard/notifications',
      occurredAt: broadcast.updatedAt,
    })),
    ...feed.items.map((item) => ({
      id: item.id,
      kind: item.kind,
      summary: item.summary,
      description: `${item.creatorName ?? 'Unknown creator'} · ${item.courseTitle}${item.moduleTitle ? ` · ${item.moduleTitle}` : ''}${item.nodeTitle ? ` · ${item.nodeTitle}` : ''}`,
      href: item.href,
      occurredAt: item.occurredAt,
    })),
  ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());

  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedEvents = paginateList(events, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Notifications"
      subtitle="A compact event inbox for creator releases, followed-course updates, and admin broadcasts."
      unreadCounts={{
        feed: await getFeedUnreadCountForViewer(viewer, feed.items),
        support: supportUnreadCount,
        notifications: 0,
      }}
    >
      <section className="stat-grid">
        <StatCard label="Unread alerts" value={String(Math.min(events.length, 9))} icon={<Bell size={18} />} />
        <StatCard label="Followed creators" value={String(feed.followedCreatorCount)} icon={<Users size={18} />} />
        <StatCard label="Recent add-ons" value={String(feed.items.length)} icon={<Rss size={18} />} />
        <StatCard label="Broadcasts" value={String(broadcasts.length)} icon={<Radio size={18} />} />
      </section>

      <section className="panel stack-lg">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Recent updates from followed creators</h2>
            <p className="muted">New courses, modules, nodes, and admin announcements all belong in this bell-driven inbox.</p>
          </div>
          <Link href="/dashboard/feed" className="button button-secondary">
            Open full feed
          </Link>
        </div>

        <ListPaginationControls
          pathname="/dashboard/notifications"
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
          <div className="empty-state">No notifications yet. Follow a creator and their latest launches will appear here.</div>
        ) : (
          <div className="editorial-list">
            {pagedEvents.items.map((item) => (
              <Link key={item.id} href={item.href} className="editorial-list-item editorial-list-item-feed">
                <div className="notifications-meta-row">
                  <span className="studio-badge studio-badge-primary">{item.kind.replaceAll('_', ' ')}</span>
                  <span className="studio-badge studio-badge-muted">{formatDateTimeLabel(item.occurredAt)}</span>
                </div>
                <h3 className="panel-title text-no-margin">{item.summary}</h3>
                <p className="muted text-no-margin">{item.description}</p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}
