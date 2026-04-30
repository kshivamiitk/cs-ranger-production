import { unstable_noStore as noStore } from 'next/cache';

import { AppShell } from '@/components/app-shell/AppShell';
import { SupportWorkspace } from '@/components/support/SupportWorkspace';
import { requireServerViewer } from '@/src/presentation/serverPage';
import {
  getSupportThreadForViewer,
  getSupportUnreadCountForViewer,
  listSupportAdmins,
  listSupportThreadsForViewer,
  markSupportThreadRead,
} from '@/src/server/adminSupport';

export default async function LearnerSupportPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
  noStore();
  const { viewer, themeMode } = await requireServerViewer('/dashboard/support');
  const params = await searchParams;
  const threadId = typeof params.thread === 'string' ? params.thread : null;

  if (threadId) {
    await markSupportThreadRead(viewer, threadId).catch(() => null);
  }

  const [admins, threads, activeThread] = await Promise.all([
    listSupportAdmins(),
    listSupportThreadsForViewer(viewer),
    threadId ? getSupportThreadForViewer(viewer, threadId) : Promise.resolve(null),
  ]);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Support"
      subtitle="Contact a real admin with a persistent complaint or suggestion thread."
      unreadCounts={{
        feed: 0,
        support: getSupportUnreadCountForViewer(viewer, threads),
        notifications: 0,
      }}
    >
      <SupportWorkspace viewerId={viewer.user.id} viewerName={viewer.profile.fullName ?? viewer.user.email} viewerIsAdmin={false} admins={admins} threads={threads} activeThread={activeThread} />
    </AppShell>
  );
}


