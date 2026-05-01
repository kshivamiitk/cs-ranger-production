import type { SearchRepository } from '@/src/domain/ports';
import type {
  SearchCreatorResult,
  SearchModuleResult,
  SearchNodeResult,
  TopCreatorSummary,
  TopCreatorsView,
} from '@/src/domain/models';
import type { AppServiceSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';

type CourseRow = Database['public']['Tables']['courses']['Row'];
type ModuleRow = Database['public']['Tables']['course_modules']['Row'];
type NodeRow = Database['public']['Tables']['course_nodes']['Row'];
type EntitlementRow = Database['public']['Tables']['course_entitlements']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type TopCreatorStatsRow = {
  creator_user_id: string;
  published_course_count: number | string | null;
  published_node_count: number | string | null;
  premium_course_count: number | string | null;
  follower_count: number | string | null;
  featured_course_titles: string[] | null;
};

function sanitizeSearchQuery(query: string) {
  return query.trim().replace(/[%,]/g, ' ');
}

function ilikePattern(query: string) {
  return `%${sanitizeSearchQuery(query)}%`;
}

function toInt(value: number | string | null | undefined) {
  return Number.parseInt(String(value ?? 0), 10) || 0;
}

export class SupabaseSearchRepository implements SearchRepository {
  constructor(private readonly supabase: AppServiceSupabaseClient) {}

  async searchEverything(input: { query: string; viewerUserId?: string | null }) {
    const normalizedQuery = sanitizeSearchQuery(input.query);
    if (!normalizedQuery) {
      return {
        modules: [],
        nodes: [],
        creators: [],
      } satisfies {
        modules: SearchModuleResult[];
        nodes: SearchNodeResult[];
        creators: SearchCreatorResult[];
      };
    }

    const [modules, nodes, creators] = await Promise.all([
      this.searchModules(normalizedQuery),
      this.searchNodes(normalizedQuery, input.viewerUserId ?? null),
      this.searchCreators(normalizedQuery, input.viewerUserId ?? null),
    ]);

    return {
      modules,
      nodes,
      creators,
    };
  }

  async listTopCreators(input: { viewerUserId?: string | null; limit?: number }) {
    const limit = Math.max(1, Math.min(input.limit ?? 6, 12));
    try {
      return await this.listTopCreatorsFromReadModel(input, limit);
    } catch (error) {
      if (process.env.NODE_ENV === 'production') {
        throw error;
      }
    }

    return this.listTopCreatorsLegacy(input, limit);
  }

  private async listTopCreatorsFromReadModel(input: { viewerUserId?: string | null }, limit: number) {
    const readModel = this.supabase.from('creator_public_stats_read_model' as any);
    const [followerResponse, contributionResponse] = await Promise.all([
      readModel
        .select('creator_user_id, published_course_count, published_node_count, premium_course_count, follower_count, featured_course_titles')
        .gt('published_course_count', 0)
        .order('follower_count', { ascending: false })
        .order('published_node_count', { ascending: false })
        .limit(limit * 3),
      this.supabase
        .from('creator_public_stats_read_model' as any)
        .select('creator_user_id, published_course_count, published_node_count, premium_course_count, follower_count, featured_course_titles')
        .gt('published_course_count', 0)
        .order('published_node_count', { ascending: false })
        .order('published_course_count', { ascending: false })
        .limit(limit * 3),
    ]);

    if ((followerResponse as any).error) throw (followerResponse as any).error;
    if ((contributionResponse as any).error) throw (contributionResponse as any).error;

    const followerStats = (((followerResponse as any).data ?? []) as TopCreatorStatsRow[]);
    const contributionStats = (((contributionResponse as any).data ?? []) as TopCreatorStatsRow[]);
    const statsRows = [...followerStats, ...contributionStats];
    const creatorIds = Array.from(new Set(statsRows.map((row) => row.creator_user_id)));

    if (creatorIds.length === 0) {
      return {
        byFollowers: [],
        byContributions: [],
      } satisfies TopCreatorsView;
    }

    const [profileResponse, viewerFollowResponse] = await Promise.all([
      this.supabase
        .from('user_profiles')
        .select('user_id, full_name, username, bio, profile_photo_url, primary_role, is_banned')
        .in('user_id', creatorIds)
        .eq('primary_role', 'creator')
        .eq('is_banned', false),
      input.viewerUserId
        ? this.supabase
            .from('creator_followers')
            .select('creator_user_id')
            .eq('follower_user_id', input.viewerUserId)
            .in('creator_user_id', creatorIds)
        : Promise.resolve({ data: [], error: null }),
    ]);

    if (profileResponse.error) throw profileResponse.error;
    if ((viewerFollowResponse as any).error) throw (viewerFollowResponse as any).error;

    const profileById = new Map(
      ((profileResponse.data ?? []) as Array<
        Pick<UserProfileRow, 'user_id' | 'full_name' | 'username' | 'bio' | 'profile_photo_url' | 'primary_role' | 'is_banned'>
      >).map((profile) => [profile.user_id, profile])
    );
    const viewerFollowingIds = new Set(
      (((viewerFollowResponse as any).data ?? []) as Array<{ creator_user_id: string }>).map((row) => row.creator_user_id)
    );
    const statsByCreatorId = new Map(statsRows.map((row) => [row.creator_user_id, row]));

    const toSummary = (row: TopCreatorStatsRow): TopCreatorSummary | null => {
      const creator = profileById.get(row.creator_user_id);
      if (!creator) return null;

      return {
        creator: {
          userId: creator.user_id,
          fullName: creator.full_name,
          username: creator.username ?? null,
          primaryRole: 'creator',
          profilePhotoUrl: creator.profile_photo_url,
          bio: creator.bio,
          isBanned: creator.is_banned,
        },
        follow: {
          creatorUserId: creator.user_id,
          followerCount: toInt(row.follower_count),
          viewerIsFollowing: viewerFollowingIds.has(creator.user_id),
        },
        publishedCourseCount: toInt(row.published_course_count),
        publishedNodeCount: toInt(row.published_node_count),
        premiumCourseCount: toInt(row.premium_course_count),
        featuredCourseTitles: row.featured_course_titles ?? [],
      } satisfies TopCreatorSummary;
    };

    return {
      byFollowers: followerStats.map(toSummary).filter((value): value is TopCreatorSummary => Boolean(value)).slice(0, limit),
      byContributions: contributionStats
        .map((row) => statsByCreatorId.get(row.creator_user_id) ?? row)
        .map(toSummary)
        .filter((value): value is TopCreatorSummary => Boolean(value))
        .slice(0, limit),
    } satisfies TopCreatorsView;
  }

  private async listTopCreatorsLegacy(input: { viewerUserId?: string | null }, limit: number) {
    const { data: creatorRows, error: creatorError } = await this.supabase
      .from('user_profiles')
.select('user_id, full_name, username, bio, profile_photo_url, primary_role, is_banned')
      .eq('primary_role', 'creator')
      .eq('is_banned', false);

    if (creatorError) {
      throw creatorError;
    }

    const creators = (creatorRows ?? []) as Array<
      Pick<UserProfileRow, 'user_id' | 'full_name' | 'username' | 'bio' | 'profile_photo_url' | 'primary_role' | 'is_banned'>
    >;

    if (creators.length === 0) {
      return {
        byFollowers: [],
        byContributions: [],
      } satisfies TopCreatorsView;
    }

    const creatorIds = creators.map((row) => row.user_id);
    const [{ data: followerRows, error: followerError }, { data: courseRows, error: courseError }] = await Promise.all([
      this.supabase
        .from('creator_followers')
        .select('creator_user_id, follower_user_id')
        .in('creator_user_id', creatorIds),
      this.supabase
        .from('courses')
        .select('id, creator_user_id, title, premium_enabled, status, updated_at')
        .eq('status', 'published')
        .in('creator_user_id', creatorIds)
        .order('updated_at', { ascending: false }),
    ]);

    if (followerError) {
      throw followerError;
    }

    if (courseError) {
      throw courseError;
    }

    const publishedCourses = (courseRows ?? []) as Array<
      Pick<CourseRow, 'id' | 'creator_user_id' | 'title' | 'premium_enabled' | 'status'>
    >;
    if (publishedCourses.length === 0) {
      return {
        byFollowers: [],
        byContributions: [],
      } satisfies TopCreatorsView;
    }

    const courseIds = publishedCourses.map((row) => row.id);
    const { data: moduleRows, error: moduleError } = await this.supabase
      .from('course_modules')
      .select('id, course_id')
      .in('course_id', courseIds);

    if (moduleError) {
      throw moduleError;
    }

    const modules = (moduleRows ?? []) as Array<Pick<ModuleRow, 'id' | 'course_id'>>;
    const moduleIds = modules.map((row) => row.id);
    const { data: nodeRows, error: nodeError } = moduleIds.length
      ? await this.supabase
          .from('course_nodes')
          .select('id, module_id')
          .in('module_id', moduleIds)
      : { data: [], error: null };

    if (nodeError) {
      throw nodeError;
    }

    const nodeCountByModuleId = new Map<string, number>();
    for (const row of ((nodeRows ?? []) as Array<Pick<NodeRow, 'id' | 'module_id'>>)) {
      nodeCountByModuleId.set(row.module_id, (nodeCountByModuleId.get(row.module_id) ?? 0) + 1);
    }

    const publishedCourseCountByCreatorId = new Map<string, number>();
    const premiumCourseCountByCreatorId = new Map<string, number>();
    const featuredCourseTitlesByCreatorId = new Map<string, string[]>();

    for (const course of publishedCourses) {
      publishedCourseCountByCreatorId.set(
        course.creator_user_id,
        (publishedCourseCountByCreatorId.get(course.creator_user_id) ?? 0) + 1
      );
      if (course.premium_enabled) {
        premiumCourseCountByCreatorId.set(
          course.creator_user_id,
          (premiumCourseCountByCreatorId.get(course.creator_user_id) ?? 0) + 1
        );
      }
      const currentFeatured = featuredCourseTitlesByCreatorId.get(course.creator_user_id) ?? [];
      if (currentFeatured.length < 3) {
        currentFeatured.push(course.title);
        featuredCourseTitlesByCreatorId.set(course.creator_user_id, currentFeatured);
      }
    }
    const publishedNodeCountByCreatorId = new Map<string, number>();
    const courseCreatorIdByCourseId = new Map(publishedCourses.map((course) => [course.id, course.creator_user_id]));
    for (const module of modules) {
      const creatorUserId = courseCreatorIdByCourseId.get(module.course_id);
      if (!creatorUserId) {
        continue;
      }

      publishedNodeCountByCreatorId.set(
        creatorUserId,
        (publishedNodeCountByCreatorId.get(creatorUserId) ?? 0) + (nodeCountByModuleId.get(module.id) ?? 0)
      );
    }

    const followerCountByCreatorId = new Map<string, number>();
    const viewerFollowingIds = new Set<string>();
    for (const row of followerRows ?? []) {
      followerCountByCreatorId.set(
        row.creator_user_id,
        (followerCountByCreatorId.get(row.creator_user_id) ?? 0) + 1
      );

      if (input.viewerUserId && row.follower_user_id === input.viewerUserId) {
        viewerFollowingIds.add(row.creator_user_id);
      }
    }

    const summaries: TopCreatorSummary[] = [];
    for (const creator of creators) {
      const publishedCourseCount = publishedCourseCountByCreatorId.get(creator.user_id) ?? 0;
      if (publishedCourseCount === 0) {
        continue;
      }

      summaries.push({
        creator: {
          userId: creator.user_id,
          fullName: creator.full_name,
          username: creator.username ?? null,
          primaryRole: 'creator',
          profilePhotoUrl: creator.profile_photo_url,
          bio: creator.bio,
          isBanned: creator.is_banned,
        },
        follow: {
          creatorUserId: creator.user_id,
          followerCount: followerCountByCreatorId.get(creator.user_id) ?? 0,
          viewerIsFollowing: viewerFollowingIds.has(creator.user_id),
        },
        publishedCourseCount,
        publishedNodeCount: publishedNodeCountByCreatorId.get(creator.user_id) ?? 0,
        premiumCourseCount: premiumCourseCountByCreatorId.get(creator.user_id) ?? 0,
        featuredCourseTitles: featuredCourseTitlesByCreatorId.get(creator.user_id) ?? [],
      });
    }

    const alphabeticalTieBreak = (left: TopCreatorSummary, right: TopCreatorSummary) =>
      (left.creator.fullName ?? 'Creator').localeCompare(right.creator.fullName ?? 'Creator');

    return {
      byFollowers: [...summaries]
        .sort((left, right) =>
          right.follow.followerCount - left.follow.followerCount ||
          right.publishedNodeCount - left.publishedNodeCount ||
          right.publishedCourseCount - left.publishedCourseCount ||
          alphabeticalTieBreak(left, right)
        )
        .slice(0, limit),
      byContributions: [...summaries]
        .sort((left, right) =>
          right.publishedNodeCount - left.publishedNodeCount ||
          right.publishedCourseCount - left.publishedCourseCount ||
          right.follow.followerCount - left.follow.followerCount ||
          alphabeticalTieBreak(left, right)
        )
        .slice(0, limit),
    } satisfies TopCreatorsView;
  }

  private async searchModules(query: string) {
    const pattern = ilikePattern(query);
    const { data, error } = await this.supabase
      .from('course_modules')
      .select('id, course_id, title, summary, position, updated_at')
      .or(`title.ilike.${pattern},summary.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(10);

    if (error) {
      throw error;
    }

    const moduleRows = (data ?? []) as Array<Pick<ModuleRow, 'id' | 'course_id' | 'title' | 'summary' | 'position'>>;
    if (moduleRows.length === 0) {
      return [];
    }

    const courseIds = Array.from(new Set(moduleRows.map((row) => row.course_id)));
    const { data: courseRows, error: courseError } = await this.supabase
      .from('courses')
      .select('id, title, image_url')
      .in('id', courseIds)
      .eq('status', 'published');

    if (courseError) {
      throw courseError;
    }

    const courseMap = new Map((courseRows ?? []).map((row) => [row.id, row]));

    return moduleRows
      .map((row) => {
        const course = courseMap.get(row.course_id);
        if (!course) {
          return null;
        }

        return {
          id: row.id,
          courseId: row.course_id,
          courseTitle: course.title,
          courseImageUrl: course.image_url,
          title: row.title,
          summary: row.summary,
          position: row.position,
        } satisfies SearchModuleResult;
      })
      .filter((value): value is SearchModuleResult => Boolean(value));
  }

  private async searchNodes(query: string, viewerUserId: string | null) {
    const pattern = ilikePattern(query);
    const { data, error } = await this.supabase
      .from('course_nodes')
      .select('id, module_id, title, type, is_premium, excerpt, position, updated_at')
      .or(`title.ilike.${pattern},excerpt.ilike.${pattern}`)
      .order('updated_at', { ascending: false })
      .limit(20);

    if (error) {
      throw error;
    }

    const candidateRows = (data ?? []) as Array<
      Pick<NodeRow, 'id' | 'module_id' | 'title' | 'type' | 'is_premium' | 'excerpt' | 'position'>
    >;

    if (candidateRows.length === 0) {
      return [];
    }

    const moduleIds = Array.from(new Set(candidateRows.map((row) => row.module_id)));
    const { data: moduleRows, error: moduleError } = await this.supabase
      .from('course_modules')
      .select('id, course_id, title, position')
      .in('id', moduleIds);

    if (moduleError) {
      throw moduleError;
    }

    const courseIds = Array.from(new Set((moduleRows ?? []).map((row) => row.course_id)));
    const { data: courseRows, error: courseError } = await this.supabase
      .from('courses')
      .select('id, title, creator_user_id, status, premium_enabled, premium_access_days, price_amount')
      .in('id', courseIds)
      .eq('status', 'published');

    if (courseError) {
      throw courseError;
    }

    const activeEntitlementCourseIds = new Set<string>();
    if (viewerUserId && courseIds.length > 0) {
      const nowIso = new Date().toISOString();
      const { data: entitlementRows, error: entitlementError } = await this.supabase
        .from('course_entitlements')
        .select('course_id')
        .eq('learner_user_id', viewerUserId)
        .eq('status', 'active')
        .gt('expires_at', nowIso)
        .in('course_id', courseIds);

      if (entitlementError) {
        throw entitlementError;
      }

      for (const row of (entitlementRows ?? []) as Array<Pick<EntitlementRow, 'course_id'>>) {
        activeEntitlementCourseIds.add(row.course_id);
      }
    }

    const moduleMap = new Map((moduleRows ?? []).map((row) => [row.id, row]));
    const courseMap = new Map((courseRows ?? []).map((row) => [row.id, row]));

    return candidateRows
      .map((row) => {
        const module = moduleMap.get(row.module_id);
        if (!module) {
          return null;
        }

        const course = courseMap.get(module.course_id);
        if (!course) {
          return null;
        }

        const viewerCanAccessPremium =
          course.creator_user_id === viewerUserId || activeEntitlementCourseIds.has(course.id);

        return {
          id: row.id,
          courseId: module.course_id,
          courseTitle: course.title,
          moduleId: module.id,
          moduleTitle: module.title,
          modulePosition: module.position,
          title: row.title,
          type: row.type,
          isPremium: row.is_premium,
          isLocked: row.is_premium && !viewerCanAccessPremium,
          position: row.position,
          snippet: row.excerpt ?? '',
        } satisfies SearchNodeResult;
      })
      .filter((value): value is SearchNodeResult => Boolean(value));
  }

  private async searchCreators(query: string, viewerUserId: string | null) {
    const pattern = ilikePattern(query);
    const { data, error } = await this.supabase
      .from('user_profiles')
.select('user_id, full_name, username, bio, profile_photo_url')
      .eq('primary_role', 'creator')
      .eq('is_banned', false)
.or(`username.ilike.${pattern},full_name.ilike.${pattern},bio.ilike.${pattern}`)
      .limit(10);

    if (error) {
      throw error;
    }

    const creatorIds = (data ?? []).map((row) => row.user_id);
    if (creatorIds.length === 0) {
      return [];
    }

    const { data: followerRows, error: followerError } = await this.supabase
      .from('creator_followers')
      .select('creator_user_id, follower_user_id')
      .in('creator_user_id', creatorIds);

    if (followerError) {
      throw followerError;
    }

    const followerCountByCreatorId = new Map<string, number>();
    const viewerFollowingIds = new Set<string>();

    for (const row of followerRows ?? []) {
      followerCountByCreatorId.set(
        row.creator_user_id,
        (followerCountByCreatorId.get(row.creator_user_id) ?? 0) + 1
      );

      if (viewerUserId && row.follower_user_id === viewerUserId) {
        viewerFollowingIds.add(row.creator_user_id);
      }
    }

    return (data ?? []).map((row) => ({
      userId: row.user_id,
      fullName: row.full_name,
      username: (row as any).username ?? null,
      bio: row.bio,
      profilePhotoUrl: row.profile_photo_url,
      followerCount: followerCountByCreatorId.get(row.user_id) ?? 0,
      viewerIsFollowing: viewerFollowingIds.has(row.user_id),
    }));
  }
}
