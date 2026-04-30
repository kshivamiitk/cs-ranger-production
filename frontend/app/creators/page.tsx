import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { TopCreatorCard } from '@/components/creators/TopCreatorCard';
import { getServerPageContext } from '@/src/presentation/serverPage';

export default async function CreatorsPage() {
  const { viewer, themeMode, container } = await getServerPageContext();
  const { searchService } = container;
  const creators = await searchService.listTopCreators(viewer, 8);
  const hasCreators = creators.byFollowers.length > 0 || creators.byContributions.length > 0;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Creators"
      subtitle="Find trusted course creators, follow their profile, and open their published course library."
    >
      <section className="stack-lg">
        {!hasCreators ? (
          <div className="empty-state">
            No public creators with published courses are available yet.
          </div>
        ) : (
          <>
            {creators.byFollowers.length > 0 ? (
              <section className="panel stack-lg">
                <div className="panel-header">
                  <div>
                    <h2 className="panel-title">Most followed creators</h2>
                    <p className="muted">Profiles learners already trust.</p>
                  </div>
                  <Link href="/search?filter=creators" className="button button-ghost">
                    Search creators
                  </Link>
                </div>
                <div className="studio-card-grid">
                  {creators.byFollowers.map((entry, index) => (
                    <TopCreatorCard
                      key={entry.creator.userId}
                      entry={entry}
                      rank={index + 1}
                      viewerUserId={viewer?.user.id ?? null}
                      emphasis="followers"
                    />
                  ))}
                </div>
              </section>
            ) : null}

            {creators.byContributions.length > 0 ? (
              <section className="panel stack-lg">
                <div>
                  <h2 className="panel-title">Most active creators</h2>
                  <p className="muted">Creators with the deepest published course libraries.</p>
                </div>
                <div className="studio-card-grid">
                  {creators.byContributions.map((entry, index) => (
                    <TopCreatorCard
                      key={entry.creator.userId}
                      entry={entry}
                      rank={index + 1}
                      viewerUserId={viewer?.user.id ?? null}
                      emphasis="contributions"
                    />
                  ))}
                </div>
              </section>
            ) : null}
          </>
        )}
      </section>
    </AppShell>
  );
}
