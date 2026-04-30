import { notFound } from 'next/navigation';

import { AppShell } from '@/components/app-shell/AppShell';
import { CatalogCourseSections } from '@/components/catalog/CatalogCourseSections';
import { CreatorProfileCard } from '@/components/creators/CreatorProfileCard';
import { getServerPageContext } from '@/src/presentation/serverPage';

export default async function CreatorPublicProfilePage({
  params,
}: {
  params: Promise<{ creatorId: string }>;
}) {
  const { creatorId } = await params;
  const { viewer, themeMode, container } = await getServerPageContext();
  const { creatorPublicProfileService } = container;

  const profile = await creatorPublicProfileService
    .getCreatorPublicProfile(viewer, creatorId)
    .catch(() => notFound());

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title={profile.creator.fullName ?? 'Creator profile'}
      subtitle="Follow creators, inspect their published course library, and open course trees from one consistent public profile page."
    >
      <section className="stack-lg">
        <CreatorProfileCard
          creator={profile.creator}
          follow={profile.follow}
          viewerUserId={viewer?.user.id ?? null}
          eyebrow="Public creator profile"
          showBio
        />

        <section className="panel stack-lg">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Published courses</h2>
              <p className="muted">Open a course tree first, then move into standalone node reading from the learner route model.</p>
            </div>
          </div>

          {profile.courses.length === 0 ? (
            <div className="empty-state">This creator has no published courses yet.</div>
          ) : (
            <CatalogCourseSections courses={profile.courses} />
          )}
        </section>
      </section>
    </AppShell>
  );
}

