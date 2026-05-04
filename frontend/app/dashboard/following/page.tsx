import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { FollowCreatorButton } from '@/components/social/FollowCreatorButton';
import { UserAvatar } from '@/components/user/UserAvatar';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { requireServerViewer } from '@/src/presentation/serverPage';
import { getSupportUnreadCountForViewerFast } from '@/src/server/adminSupport';

export default async function FollowingCreatorsPage() {
  const { viewer, themeMode } = await requireServerViewer('/dashboard/following');
  const supabase = createServiceRoleSupabaseClient();
  const [supportUnreadCount, { data: followRows }] = await Promise.all([
    getSupportUnreadCountForViewerFast(viewer),
    supabase
      .from('creator_followers')
      .select('creator_user_id')
      .eq('follower_user_id', viewer.user.id),
  ]);

  const creatorIds = [...new Set((followRows ?? []).map((row: any) => row.creator_user_id))];
  const [{ data: creators }, { data: courses }] = await Promise.all([
    creatorIds.length
      ? supabase
          .from('user_profiles')
          .select('user_id, full_name, profile_photo_url, bio')
          .in('user_id', creatorIds)
          .eq('primary_role', 'creator')
          .eq('is_banned', false)
      : Promise.resolve({ data: [] as any[] }),
    creatorIds.length
      ? supabase
          .from('courses')
          .select('id, creator_user_id, title, updated_at')
          .in('creator_user_id', creatorIds)
          .eq('status', 'published')
      : Promise.resolve({ data: [] as any[] }),
  ]);

  const coursesByCreator = new Map<string, any[]>();
  for (const course of courses ?? []) {
    const list = coursesByCreator.get((course as any).creator_user_id) ?? [];
    list.push(course);
    coursesByCreator.set((course as any).creator_user_id, list);
  }

  const followedCreators = (creators ?? [])
    .map((creator: any) => {
      const creatorCourses = [...(coursesByCreator.get(creator.user_id) ?? [])].sort(
        (left, right) => new Date(right.updated_at).getTime() - new Date(left.updated_at).getTime()
      );
      return {
        userId: creator.user_id,
        fullName: creator.full_name,
        profilePhotoUrl: creator.profile_photo_url ?? null,
        bio: creator.bio ?? null,
        latestCourse: creatorCourses[0] ?? null,
        courseCount: creatorCourses.length,
      };
    })
    .sort((left, right) => left.fullName?.localeCompare(right.fullName ?? '') ?? -1);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Following creators"
      subtitle="A clean directory of the creators you follow, with the latest release context and fast access to each profile."
      unreadCounts={{
        feed: 0,
        support: supportUnreadCount,
        notifications: 0,
      }}
      hideHeader
    >
      <div className="stack-lg">
        {followedCreators.length === 0 ? (
          <section className="panel stack-lg">
            <div className="empty-state">You are not following any creators yet. Follow a creator to build your release stream and premium learning network.</div>
            <div className="inline action-cluster center-inline">
              <Link href="/creators" className="button">Find creators</Link>
            </div>
          </section>
        ) : (
          <section className="v12-following-grid">
            {followedCreators.map((creator) => (
              <article key={creator.userId} className="panel stack-lg v12-following-card">
                <div className="inline action-cluster creator-profile-inline">
                  <UserAvatar src={creator.profilePhotoUrl} name={creator.fullName ?? 'Creator'} alt={creator.fullName ?? 'Creator'} size="md" />
                  <div className="stack stack-micro">
                    <h2 className="panel-title flush">{creator.fullName ?? 'Unknown creator'}</h2>
                    <span className="muted">{creator.courseCount} published course{creator.courseCount === 1 ? '' : 's'}</span>
                  </div>
                </div>
                <p className="muted flush">{creator.bio ?? 'Creator profile available.'}</p>
                <div className="inline premium-badge-row">
                  <span className="studio-badge studio-badge-primary">Following</span>
                  {creator.latestCourse ? <span className="studio-badge studio-badge-muted">Latest: {creator.latestCourse.title}</span> : null}
                </div>
                <div className="inline split-inline">
                  <Link href={`/creators/${creator.userId}`} className="button button-secondary">View creator</Link>
                  <FollowCreatorButton creatorUserId={creator.userId} viewerUserId={viewer.user.id} initialFollowing={true} initialFollowerCount={0} compact />
                </div>
              </article>
            ))}
          </section>
        )}
      </div>
    </AppShell>
  );
}
