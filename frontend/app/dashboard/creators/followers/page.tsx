import Link from 'next/link';
import { Award, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { TopCreatorCard } from '@/components/creators/TopCreatorCard';
import { StatCard } from '@/components/ui/StatCard';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerViewer } from '@/src/presentation/serverPage';

export default async function TopCreatorsByFollowersPage() {
  const [{ viewer, themeMode }, { searchService }] = await Promise.all([
    requireServerViewer('/dashboard/creators/followers'),
    createServerContainer(),
  ]);

  const topCreators = await searchService.listTopCreators(viewer, 6);
  const list = topCreators.byFollowers;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Top creators by followers"
      subtitle="Creators with published courses, ranked by follower count."
      actions={
        <Link href="/dashboard/creators/contributions" className="button button-secondary">
          <Award size={16} aria-hidden />
          By contribution
        </Link>
      }
    >
      <p className="muted" style={{ margin: 0 }}>
        <Link href="/dashboard/creators" className="button button-ghost" style={{ padding: 0 }}>
          ← All rankings
        </Link>
      </p>

      <section className="stat-grid">
        <StatCard label="Creators listed" value={String(list.length)} icon={<Users size={18} />} />
        <StatCard
          label="Highest follower count"
          value={String(list[0]?.follow.followerCount ?? 0)}
          icon={<Users size={18} />}
        />
        <StatCard
          label="Leader published nodes"
          value={String(list[0]?.publishedNodeCount ?? 0)}
          icon={<Award size={18} />}
        />
      </section>

      <section className="panel stack-lg">
        <div>
          <h2 className="panel-title">Leaderboard</h2>
          <p className="muted">Profile links and follow actions stay live for each row.</p>
        </div>

        {list.length === 0 ? (
          <div className="empty-state">No public creators with published courses are available yet.</div>
        ) : (
          <div className="stack">
            {list.map((entry, index) => (
              <TopCreatorCard
                key={entry.creator.userId}
                entry={entry}
                rank={index + 1}
                viewerUserId={viewer.user.id}
                emphasis="followers"
              />
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}


