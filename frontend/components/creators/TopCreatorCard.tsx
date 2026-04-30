import Link from 'next/link';
import { Award, BookOpen, Layers3, Users } from 'lucide-react';

import { FollowCreatorButton } from '@/components/social/FollowCreatorButton';
import { UserAvatar } from '@/components/user/UserAvatar';
import type { TopCreatorSummary } from '@/src/domain/models';

export function TopCreatorCard(props: {
  entry: TopCreatorSummary;
  rank: number;
  viewerUserId: string | null;
  emphasis: 'followers' | 'contributions';
}) {
  const primaryMetric =
    props.emphasis === 'followers'
      ? `${props.entry.follow.followerCount} follower${props.entry.follow.followerCount === 1 ? '' : 's'}`
      : `${props.entry.publishedNodeCount} published node${props.entry.publishedNodeCount === 1 ? '' : 's'}`;

  return (
    <section className="panel stack top-creator-card">
      <div className="top-creator-card-header">
        <div className="top-creator-card-identity">
          <div className="top-creator-rank-chip">
            <Award size={14} />
            #{props.rank}
          </div>
          <Link href={`/creators/${props.entry.creator.userId}`} className="top-creator-avatar-link">
            <UserAvatar
              src={props.entry.creator.profilePhotoUrl}
              name={props.entry.creator.fullName ?? 'Creator'}
              alt={props.entry.creator.fullName ?? 'Creator'}
              size="lg"
            />
          </Link>
          <div className="stack" style={{ gap: 8 }}>
            <div className="section-label">
              {props.emphasis === 'followers' ? 'Top by followers' : 'Top by contribution'}
            </div>
            <div className="stack" style={{ gap: 6 }}>
              <Link href={`/creators/${props.entry.creator.userId}`} className="creator-profile-card-name-link">
                <h2 className="panel-title" style={{ margin: 0 }}>{props.entry.creator.fullName ?? 'Creator profile'}</h2>
              </Link>
              <p className="muted" style={{ margin: 0 }}>
                {primaryMetric}
              </p>
              {props.entry.creator.bio ? <p className="muted" style={{ margin: 0 }}>{props.entry.creator.bio}</p> : null}
            </div>
          </div>
        </div>

        <FollowCreatorButton
          creatorUserId={props.entry.creator.userId}
          viewerUserId={props.viewerUserId}
          initialFollowing={props.entry.follow.viewerIsFollowing}
          initialFollowerCount={props.entry.follow.followerCount}
        />
      </div>

      <div className="inline premium-badge-row top-creator-stat-row">
        <span className="studio-badge studio-badge-primary">
          <Users size={14} />
          {props.entry.follow.followerCount} follower{props.entry.follow.followerCount === 1 ? '' : 's'}
        </span>
        <span className="studio-badge studio-badge-muted">
          <BookOpen size={14} />
          {props.entry.publishedCourseCount} published course{props.entry.publishedCourseCount === 1 ? '' : 's'}
        </span>
        <span className="studio-badge studio-badge-muted">
          <Layers3 size={14} />
          {props.entry.publishedNodeCount} node{props.entry.publishedNodeCount === 1 ? '' : 's'}
        </span>
        {props.entry.premiumCourseCount > 0 ? (
          <span className="studio-badge studio-badge-muted">
            {props.entry.premiumCourseCount} premium course{props.entry.premiumCourseCount === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      {props.entry.featuredCourseTitles.length > 0 ? (
        <div className="stack" style={{ gap: 8 }}>
          <div className="section-label">Featured courses</div>
          <div className="top-creator-course-list">
            {props.entry.featuredCourseTitles.map((title) => (
              <span key={title} className="top-creator-course-pill">
                {title}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      <div className="inline" style={{ justifyContent: 'flex-end' }}>
        <Link href={`/creators/${props.entry.creator.userId}`} className="button button-secondary">
          Open creator profile
        </Link>
      </div>
    </section>
  );
}


