import type { CreatorFollowRepository } from '@/src/domain/ports';
import type { AppSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

export class SupabaseCreatorFollowRepository implements CreatorFollowRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async followCreator(input: { creatorUserId: string; followerUserId: string }) {
    const { error } = await this.supabase
      .from('creator_followers')
      .upsert(
        {
          creator_user_id: input.creatorUserId,
          follower_user_id: input.followerUserId,
        },
        { onConflict: 'creator_user_id,follower_user_id', ignoreDuplicates: true }
      );

    if (error) {
      throw error;
    }
  }

  async unfollowCreator(input: { creatorUserId: string; followerUserId: string }) {
    const { error } = await this.supabase
      .from('creator_followers')
      .delete()
      .eq('creator_user_id', input.creatorUserId)
      .eq('follower_user_id', input.followerUserId);

    if (error) {
      throw error;
    }
  }

  async getFollowState(input: { creatorUserId: string; viewerUserId: string | null }) {
    const [{ count, error: countError }, followResult] = await Promise.all([
      this.supabase
        .from('creator_followers')
        .select('creator_user_id', { count: 'exact', head: true })
        .eq('creator_user_id', input.creatorUserId),
      input.viewerUserId
        ? this.supabase
            .from('creator_followers')
            .select('creator_user_id')
            .eq('creator_user_id', input.creatorUserId)
            .eq('follower_user_id', input.viewerUserId)
            .maybeSingle()
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (countError) {
      throw countError;
    }

    if (followResult.error) {
      throw followResult.error;
    }

    return {
      creatorUserId: input.creatorUserId,
      followerCount: count ?? 0,
      viewerIsFollowing: Boolean(followResult.data),
    };
  }

  async listFollowedCreatorIds(followerUserId: string) {
    const { data, error } = await this.supabase
      .from('creator_followers')
      .select('creator_user_id')
      .eq('follower_user_id', followerUserId);

    if (error) {
      throw error;
    }

    return [...new Set((data ?? []).map((row) => row.creator_user_id))];
  }
}


