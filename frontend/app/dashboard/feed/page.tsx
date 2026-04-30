import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateTimeLabel } from '@/lib/utils';
import { requireServerPageContext } from '@/src/presentation/serverPage';
import { getSupportUnreadCountForViewer, listSupportThreadsForViewer } from '@/src/server/adminSupport';
import { markFeedItemsSeen } from '@/src/server/feedSeen';

export default async function LearnerFeedPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { viewer, themeMode, container } = await requireServerPageContext('/dashboard/feed');
  const { learnerDashboardService } = container;
  const [dashboard, supportThreads] = await Promise.all([
    learnerDashboardService.getDashboard(viewer, { includeFeed: true }),
    listSupportThreadsForViewer(viewer),
  ]);

  await markFeedItemsSeen(viewer, dashboard.feed.items);

  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedFeed = paginateList(dashboard.feed.items, pagination.page, pagination.size);
  const supportUnread = getSupportUnreadCountForViewer(viewer, supportThreads);

  const followedCreators = Array.from(
    new Map(
      dashboard.feed.items.map((item) => [
        item.creatorUserId,
        {
          creatorName: item.creatorName ?? 'Unknown creator',
          latestSummary: item.summary,
          latestAt: item.occurredAt,
        },
      ])
    ).entries()
  );

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Feed"
      subtitle="Only the release stream you actually care about — new courses, modules, nodes, and creator updates from people you follow."
      unreadCounts={{ feed: 0, support: supportUnread, notifications: 0 }}
    >
      <section className="v13-feed-layout">
        <section className="panel stack-lg v13-feed-stream-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title" style={{ margin: 0 }}>Feed items</h2>
              <p className="muted" style={{ marginTop: 8 }}>Viewed items are marked seen automatically when you open this page.</p>
            </div>
          </div>

          <ListPaginationControls
            pathname="/dashboard/feed"
            searchParams={resolvedSearchParams}
            page={pagedFeed.page}
            size={pagedFeed.size}
            totalItems={pagedFeed.totalItems}
            totalPages={pagedFeed.totalPages}
            startIndex={pagedFeed.startIndex}
            endIndex={pagedFeed.endIndex}
            noun="feed items"
          />

          {pagedFeed.items.length === 0 ? (
            <div className="empty-state">No feed items yet. Follow creators to populate this stream.</div>
          ) : (
            <div className="v13-feed-list">
              {pagedFeed.items.map((item) => (
                <Link key={item.id} href={item.href} className="v13-feed-item">
                  <div className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-primary">{item.kind.replaceAll('_', ' ')}</span>
                      {item.nodeType ? <span className="studio-badge studio-badge-muted">{item.nodeType}</span> : null}
                    </div>
                    <span className="studio-badge studio-badge-muted">{formatDateTimeLabel(item.occurredAt)}</span>
                  </div>
                  <h3 className="panel-title" style={{ margin: 0 }}>{item.summary}</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {item.creatorName ?? 'Unknown creator'} · {item.courseTitle}
                    {item.moduleTitle ? ` · ${item.moduleTitle}` : ''}
                    {item.nodeTitle ? ` · ${item.nodeTitle}` : ''}
                  </p>
                </Link>
              ))}
            </div>
          )}
        </section>

        <aside className="stack-lg">
          <section className="panel stack-lg v13-followed-creators-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title" style={{ margin: 0 }}>Followed creators</h2>
                <p className="muted" style={{ marginTop: 8 }}>The latest thing each creator shipped appears right here.</p>
              </div>
            </div>
            {followedCreators.length === 0 ? (
              <div className="empty-state compact">No followed creators yet.</div>
            ) : (
              <div className="stack" style={{ gap: 12 }}>
                {followedCreators.map(([creatorId, creator]) => (
                  <Link key={creatorId} href={`/creators/${creatorId}`} className="v13-followed-creator-card">
                    <strong>{creator.creatorName}</strong>
                    <span className="muted">{creator.latestSummary}</span>
                    <span className="muted">{formatDateTimeLabel(creator.latestAt)}</span>
                  </Link>
                ))}
              </div>
            )}
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
