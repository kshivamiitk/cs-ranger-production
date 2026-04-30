import { defaultTheme } from '@/lib/constants';
import { cachedValue, invalidateCacheByPrefix } from '@/shared/performance/apiCache';
import { mapUserProfile } from '@/src/infrastructure/supabase/mappers';
import type { ThemeMode, UserRole } from '@/src/domain/models';
import type { UserProfileRepository } from '@/src/domain/ports';
import type { AppSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

const profileSelect = 'user_id, full_name, username, primary_role, theme_mode, profile_photo_url, bio, github_username, github_profile_url, is_admin, is_banned, created_at, updated_at';
const profileCacheTtlMs = Number(process.env.LCP_PROFILE_CACHE_MS ?? 20_000);

function profileCacheKey(userId: string) {
  return `lcp:profile:${userId}`;
}

function invalidateProfileCache(userId: string) {
  invalidateCacheByPrefix(profileCacheKey(userId));
}

export class SupabaseUserProfileRepository implements UserProfileRepository {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async getByUserId(userId: string) {
    return cachedValue(profileCacheKey(userId), profileCacheTtlMs, async () => {
      const { data, error } = await this.supabase
        .from('user_profiles')
        .select(profileSelect)
        .eq('user_id', userId)
        .maybeSingle();

      if (error) {
        throw error;
      }

      return data ? mapUserProfile(data) : null;
    });
  }

  async getByUsername(username: string) {
    const normalized = username.trim().toLowerCase();
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(profileSelect)
      .eq('username', normalized)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapUserProfile(data) : null;
  }

  async getPublicCreatorById(userId: string) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .select(profileSelect)
      .eq('user_id', userId)
      .eq('primary_role', 'creator')
      .eq('is_banned', false)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapUserProfile(data) : null;
  }

  async getPublicCreatorByHandle(handle: string) {
    const normalized = handle.trim().toLowerCase();
    const usernameResponse = await this.supabase
      .from('user_profiles')
      .select(profileSelect)
      .eq('username', normalized)
      .eq('primary_role', 'creator')
      .eq('is_banned', false)
      .maybeSingle();

    if (usernameResponse.error) {
      throw usernameResponse.error;
    }

    if (usernameResponse.data) {
      return mapUserProfile(usernameResponse.data);
    }

    return this.getPublicCreatorById(handle);
  }

  async searchCreatorsByUsername(input: { query: string; excludeUserId?: string | null; limit?: number }) {
    const normalized = input.query.trim().toLowerCase();
    if (!normalized) {
      return [];
    }

    let query = this.supabase
      .from('user_profiles')
      .select(profileSelect)
      .eq('primary_role', 'creator')
      .eq('is_banned', false)
      .or(`username.ilike.%${normalized}%,full_name.ilike.%${normalized}%`)
      .limit(Math.max(1, Math.min(input.limit ?? 10, 20)));

    if (input.excludeUserId) {
      query = query.neq('user_id', input.excludeUserId);
    }

    const { data, error } = await query.order('username', { ascending: true });
    if (error) {
      throw error;
    }

    return (data ?? []).map(mapUserProfile);
  }

  async upsert(input: {
    userId: string;
    fullName: string | null;
    username?: string | null;
    primaryRole: UserRole;
    themeMode?: ThemeMode;
    profilePhotoUrl?: string | null;
    bio?: string | null;
    githubUsername?: string | null;
    githubProfileUrl?: string | null;
  }) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .upsert(
        {
          user_id: input.userId,
          full_name: input.fullName,
          username: input.username ?? null,
          primary_role: input.primaryRole,
          theme_mode: input.themeMode ?? defaultTheme,
          profile_photo_url: input.profilePhotoUrl ?? null,
          bio: input.bio ?? null,
          github_username: input.githubUsername ?? null,
          github_profile_url: input.githubProfileUrl ?? null,
        },
        {
          onConflict: 'user_id',
        }
      )
      .select(profileSelect)
      .single();

    if (error) {
      throw error;
    }

    invalidateProfileCache(input.userId);
    return mapUserProfile(data);
  }

  async updateOwnProfile(input: {
    userId: string;
    fullName: string | null;
    username?: string | null;
    profilePhotoUrl: string | null;
    bio: string | null;
    themeMode: ThemeMode;
    githubUsername?: string | null;
    githubProfileUrl?: string | null;
  }) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({
        full_name: input.fullName,
        username: input.username ?? null,
        profile_photo_url: input.profilePhotoUrl,
        bio: input.bio,
        theme_mode: input.themeMode,
        github_username: input.githubUsername ?? null,
        github_profile_url: input.githubProfileUrl ?? null,
      })
      .eq('user_id', input.userId)
      .select(profileSelect)
      .single();

    if (error) {
      throw error;
    }

    invalidateProfileCache(input.userId);
    return mapUserProfile(data);
  }

  async updateThemeMode(userId: string, themeMode: ThemeMode) {
    const { error } = await this.supabase
      .from('user_profiles')
      .update({ theme_mode: themeMode })
      .eq('user_id', userId);

    if (error) {
      throw error;
    }
    invalidateProfileCache(userId);
  }

  async setBannedState(targetUserId: string, isBanned: boolean) {
    const { data, error } = await this.supabase
      .from('user_profiles')
      .update({ is_banned: isBanned })
      .eq('user_id', targetUserId)
      .select(profileSelect)
      .single();

    if (error) {
      throw error;
    }

    invalidateProfileCache(targetUserId);
    return mapUserProfile(data);
  }
}


