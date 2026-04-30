import Link from 'next/link';
import { Bell, Radio, Shield, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateTimeLabel } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';
import { listBroadcastsForViewer } from '@/src/server/adminBroadcasts';

export default async function AdminNotificationsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { adminQueryService }] = await Promise.all([
    requireServerAdmin('/admin/notifications'),
    createServerContainer(),
  ]);
  const [messages, broadcasts] = await Promise.all([
    adminQueryService.listInboxMessages(viewer),
    listBroadcastsForViewer(viewer),
  ]);
  const events = [
    ...messages.map((message) => ({
      id: `message-${message.id}`,
      kind: message.messageType,
      title: message.subject ?? 'No subject',
      description: message.message,
      href: '/admin/support',
      status: message.status,
      occurredAt: message.createdAt,
    })),
    ...broadcasts.map((broadcast) => ({
      id: `broadcast-${broadcast.id}`,
      kind: 'broadcast',
      title: broadcast.title,
      description: broadcast.body,
      href: broadcast.ctaHref ?? '/admin/broadcasts',
      status: broadcast.audience,
      occurredAt: broadcast.updatedAt,
    })),
  ].sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime());
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedEvents = paginateList(events, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin Console"
      title="Notifications"
      subtitle="Administrative alerts, support signals, and platform broadcasts belong here so the bell remains a true event inbox across every workspace."
    >
      <section className="stat-grid">
        <StatCard label="Inbox alerts" value={String(events.length)} icon={<Bell size={18} />} />
        <StatCard label="Open issues" value={String(messages.filter((message) => message.status === 'open').length)} icon={<Shield size={18} />} />
        <StatCard label="Unique senders" value={String(new Set(messages.map((message) => message.senderUserId)).size)} icon={<Users size={18} />} />
        <StatCard label="Active broadcasts" value={String(broadcasts.length)} icon={<Radio size={18} />} />
      </section>

      <section className="panel stack-lg">
        <div className="panel-header">
          <div>
            <h2 className="panel-title">Administrative event inbox</h2>
            <p className="muted">These alerts now include support queue signals and published broadcast announcements.</p>
          </div>
          <div className="notifications-header-actions">
            <Link href="/admin/support" className="button button-secondary">
              Open moderation inbox
            </Link>
            <Link href="/admin/broadcasts" className="button button-ghost">
              Open broadcasts
            </Link>
          </div>
        </div>

        <ListPaginationControls
          pathname="/admin/notifications"
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
          <div className="empty-state">No administrative alerts yet.</div>
        ) : (
          <div className="stack">
            {pagedEvents.items.map((event) => (
              <Link key={event.id} href={event.href} className="card stack notifications-feed-card">
                <div className="notifications-meta-row">
                  <div className="inline premium-badge-row">
                    <span className="studio-badge studio-badge-primary">{event.kind}</span>
                    <span className="studio-badge studio-badge-muted">{event.status}</span>
                  </div>
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


