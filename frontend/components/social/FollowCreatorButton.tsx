'use client';

import Link from 'next/link';
import { usePathname, useSearchParams, useRouter } from 'next/navigation';
import { useState, useTransition } from 'react';

import { apiJson } from '@/src/presentation/http/client';
import { Button } from '@/components/ui/Button';

export function FollowCreatorButton(props: {
  creatorUserId: string;
  viewerUserId: string | null;
  initialFollowing: boolean;
  initialFollowerCount: number;
  compact?: boolean;
}) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [following, setFollowing] = useState(props.initialFollowing);
  const [followerCount, setFollowerCount] = useState(props.initialFollowerCount);
  const nextPath = `${pathname}${searchParams?.toString() ? `?${searchParams.toString()}` : ''}`;

  if (!props.viewerUserId) {
    return (
      <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className={props.compact ? 'button creator-subscribe-button' : 'button'}>
        Follow
      </Link>
    );
  }

  if (props.viewerUserId === props.creatorUserId) {
    return (
      <span className={props.compact ? 'button button-secondary creator-subscribe-button' : 'button button-secondary'} aria-disabled="true">
        Your profile
      </span>
    );
  }

  function handleToggle() {
    startTransition(async () => {
      try {
        const result = await apiJson<{ follow: { viewerIsFollowing: boolean; followerCount: number } }>(
          `/api/creators/${props.creatorUserId}/follow`,
          {
            method: following ? 'DELETE' : 'POST',
          }
        );

        setFollowing(result.follow.viewerIsFollowing);
        setFollowerCount(result.follow.followerCount);
        router.refresh();
      } catch {
        // keep current state; route utils already returns user-facing errors for forms/pages.
      }
    });
  }

  return (
    <Button
      type="button"
      variant={following ? 'secondary' : 'primary'}
      className={props.compact ? 'creator-subscribe-button' : undefined}
      disabled={pending}
      onClick={handleToggle}
    >
      {following ? 'Following' : 'Subscribe'}
      {props.compact ? null : ` · ${followerCount}`}
    </Button>
  );
}


