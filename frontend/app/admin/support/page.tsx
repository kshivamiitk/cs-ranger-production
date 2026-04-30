import { unstable_noStore as noStore } from 'next/cache';

import { AppShell } from '@/components/app-shell/AppShell';
import { SupportWorkspace } from '@/components/support/SupportWorkspace';
import { requireServerAdmin } from '@/src/presentation/serverPage';
import {
  getSupportThreadForViewer,
  getSupportUnreadCountForViewer,
  listSupportThreadsForViewer,
  markSupportThreadRead,
} from '@/src/server/adminSupport';

export default async function AdminSupportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  noStore();
  const { viewer, themeMode } = await requireServerAdmin('/admin/support');
  const params = await searchParams;
  const threadId = typeof params.thread === 'string' ? params.thread : null;

  if (threadId) {
    await markSupportThreadRead(viewer, threadId).catch(() => null);
  }

  const [threads, activeThread] = await Promise.all([
    listSupportThreadsForViewer(viewer),
    threadId ? getSupportThreadForViewer(viewer, threadId) : Promise.resolve(null),
  ]);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Support inbox"
      subtitle="Persistent, participant-scoped support threads assigned to you."
      unreadCounts={{ support: getSupportUnreadCountForViewer(viewer, threads), notifications: 0 }}
    >
      <SupportWorkspace viewerId={viewer.user.id} viewerName={viewer.profile.fullName ?? viewer.user.email} viewerIsAdmin={true} admins={[]} threads={threads} activeThread={activeThread} />
    </AppShell>
  );
}


