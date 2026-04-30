import { AppShell } from '@/components/app-shell/AppShell';
import { AdminBroadcastComposer } from '@/components/admin/AdminBroadcastComposer';
import { requireServerAdmin } from '@/src/presentation/serverPage';
import { listAdminBroadcasts } from '@/src/server/adminBroadcasts';

export default async function AdminBroadcastsPage() {
  const [{ viewer, themeMode }, broadcasts] = await Promise.all([
    requireServerAdmin('/admin/broadcasts'),
    listAdminBroadcasts(),
  ]);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin Console"
      title="Broadcasts"
      subtitle="Compose platform-wide announcements that will appear inside user notification inboxes."
    >
      <AdminBroadcastComposer broadcasts={broadcasts} />
    </AppShell>
  );
}


