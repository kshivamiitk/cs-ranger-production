import { BookmarkCheck } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CatalogCourseCard } from '@/components/catalog/CatalogCourseCard';
import { StatCard } from '@/components/ui/StatCard';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerViewer } from '@/src/presentation/serverPage';

export default async function LearnerWishlistPage() {
  const [{ viewer, themeMode }, { catalogService, wishlistQueryService }] = await Promise.all([
    requireServerViewer('/dashboard/wishlist'),
    createServerContainer(),
  ]);

  const catalogCourses = await catalogService.listPublishedCourses(viewer);
  const savedCourses = await wishlistQueryService.getLearnerWishlist(viewer, catalogCourses);
  const sortedSavedCourses = [...savedCourses].sort(
    (left, right) => new Date(right.savedAt).getTime() - new Date(left.savedAt).getTime()
  );
  const activePremiumSaved = sortedSavedCourses.filter((entry) => Boolean(entry.course.access.activeEntitlement)).length;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Wishlist"
      subtitle="Courses you saved for later, with access state and progress preserved so you can reopen them from one shelf."
    >
      <section className="stat-grid">
        <StatCard label="Saved courses" value={String(sortedSavedCourses.length)} icon={<BookmarkCheck size={18} />} />
        <StatCard label="Unlocked now" value={String(sortedSavedCourses.filter((entry) => entry.course.access.viewerCanAccessPremium).length)} icon={<BookmarkCheck size={18} />} />
        <StatCard label="Active premium" value={String(activePremiumSaved)} icon={<BookmarkCheck size={18} />} />
      </section>

      <section className="panel stack-lg">
        <div>
          <h2 className="panel-title">Saved for later</h2>
          <p className="muted">
            Wishlist entries stay tied to your learner account. If a course later becomes accessible or you make progress, the card below reflects that state automatically.
          </p>
        </div>

        {sortedSavedCourses.length === 0 ? (
          <div className="empty-state">No wishlisted courses yet. Save any course from the catalog and it will appear here.</div>
        ) : (
          <div className="studio-card-grid">
            {sortedSavedCourses.map((entry) => (
              <CatalogCourseCard key={entry.course.id} course={entry.course} />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}


