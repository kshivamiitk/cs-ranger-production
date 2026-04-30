import { Bookmark } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { LearnerNodeBookmarksList } from '@/components/learner/LearnerNodeBookmarksList';
import { StatCard } from '@/components/ui/StatCard';
import { requireServerPageContext } from '@/src/presentation/serverPage';

export default async function LearnerBookmarksPage() {
  const { viewer, themeMode, container } = await requireServerPageContext('/dashboard/bookmarks');
  const { nodeBookmarkQueryService } = container;
  const bookmarks = await nodeBookmarkQueryService.getBookmarkedNodesView(viewer);
  const readyCount = bookmarks.filter((item) => !item.isLocked).length;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Node Bookmarks"
      subtitle="Save important nodes for future study and reopen them directly from one learner bookmark shelf."
    >
      <section className="stat-grid">
        <StatCard label="Saved nodes" value={String(bookmarks.length)} icon={<Bookmark size={18} />} />
        <StatCard label="Ready to open" value={String(readyCount)} icon={<Bookmark size={18} />} />
        <StatCard label="Locked now" value={String(Math.max(bookmarks.length - readyCount, 0))} icon={<Bookmark size={18} />} />
      </section>

      <section className="panel stack-lg">
        <div>
          <h2 className="panel-title">Saved for later</h2>
          <p className="muted">
            Bookmarks stay tied to your account. If premium access expires, the saved node still stays here and opens back into the reader.
          </p>
        </div>

        <LearnerNodeBookmarksList items={bookmarks} />
      </section>
    </AppShell>
  );
}

