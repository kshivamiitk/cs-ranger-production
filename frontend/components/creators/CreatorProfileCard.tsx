import Link from 'next/link';

import type { CreatorFollowState, PublicUserSummary } from '@/src/domain/models';
import { FollowCreatorButton } from '@/components/social/FollowCreatorButton';
import { UserAvatar } from '@/components/user/UserAvatar';

export function CreatorProfileCard(props: {
  creator: PublicUserSummary;
  follow: CreatorFollowState;
  viewerUserId: string | null;
  eyebrow?: string;
  showBio?: boolean;
  compact?: boolean;
}) {
  const followerLabel = `${props.follow.followerCount} follower${props.follow.followerCount === 1 ? '' : 's'}`;

  return (
    <section className={`panel stack creator-profile-card ${props.compact ? 'creator-profile-card-compact' : ''}`.trim()}>
      <div className="creator-profile-card-header">
        <div className="creator-profile-card-identity">
          <Link href={`/creators/${props.creator.username ?? props.creator.userId}`} className="creator-profile-card-avatar-link">
            <UserAvatar
              src={props.creator.profilePhotoUrl}
              name={props.creator.fullName ?? 'Creator'}
              alt={props.creator.fullName ?? 'Creator'}
              size={props.compact ? 'md' : 'lg'}
            />
          </Link>
          <div className="stack" style={{ gap: 8 }}>
            {!props.compact ? <div className="section-label">{props.eyebrow ?? 'Course creator'}</div> : null}
            <div className="stack" style={{ gap: 6 }}>
              <Link href={`/creators/${props.creator.username ?? props.creator.userId}`} className="creator-profile-card-name-link">
                <h2 className="panel-title" style={{ margin: 0 }}>{props.creator.fullName ?? 'Creator profile'}</h2>
              </Link>
              {props.creator.username ? <p className="muted" style={{ margin: 0 }}>@{props.creator.username}</p> : null}
              {props.compact ? (
                <p className="muted" style={{ margin: 0 }}>{followerLabel}</p>
              ) : null}
              {props.showBio && props.creator.bio ? <p className="muted" style={{ margin: 0 }}>{props.creator.bio}</p> : null}
            </div>
            {!props.compact ? (
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">creator</span>
                <span className="studio-badge studio-badge-muted">{followerLabel}</span>
              </div>
            ) : null}
          </div>
        </div>

        <FollowCreatorButton
          creatorUserId={props.creator.userId}
          viewerUserId={props.viewerUserId}
          initialFollowing={props.follow.viewerIsFollowing}
          initialFollowerCount={props.follow.followerCount}
          compact={props.compact}
        />
      </div>
    </section>
  );
}


