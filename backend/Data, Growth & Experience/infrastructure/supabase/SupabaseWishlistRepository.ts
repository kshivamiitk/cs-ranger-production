import type { WishlistRepository } from '@/src/domain/ports';
import type { Database } from '@/types/database';
import { mapCourseWishlistEntry } from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';

type CourseWishlistEntryRow = Database['public']['Tables']['course_wishlist_entries']['Row'];

export class SupabaseWishlistRepository implements WishlistRepository {
  constructor(
    private readonly _supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async listWishlistStates(input: { learnerUserId: string; courseIds: string[] }) {
    if (input.courseIds.length === 0) {
      return [];
    }

    const [{ data: entryRows, error: entryError }, { data: countRows, error: countError }] =
      await Promise.all([
        this.serviceSupabase
          .from('course_wishlist_entries')
          .select('course_id')
          .eq('learner_user_id', input.learnerUserId)
          .in('course_id', input.courseIds),
        this.serviceSupabase
          .from('course_wishlist_entries')
          .select('course_id')
          .in('course_id', input.courseIds),
      ]);

    if (entryError) {
      throw entryError;
    }

    if (countError) {
      throw countError;
    }

    const wishlistedIds = new Set((entryRows ?? []).map((row) => row.course_id));
    const countByCourseId = new Map<string, number>();

    for (const row of countRows ?? []) {
      countByCourseId.set(row.course_id, (countByCourseId.get(row.course_id) ?? 0) + 1);
    }

    return input.courseIds.map((courseId) => ({
      courseId,
      isWishlisted: wishlistedIds.has(courseId),
      wishlistCount: countByCourseId.get(courseId) ?? 0,
      canWishlist: true,
    }));
  }

  async addWishlistEntry(input: { courseId: string; learnerUserId: string }) {
    const { data, error } = await this.serviceSupabase
      .from('course_wishlist_entries')
      .upsert(
        {
          course_id: input.courseId,
          learner_user_id: input.learnerUserId,
        },
        {
          onConflict: 'course_id,learner_user_id',
        }
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCourseWishlistEntry(data as CourseWishlistEntryRow);
  }

  async removeWishlistEntry(input: { courseId: string; learnerUserId: string }) {
    const { error } = await this.serviceSupabase
      .from('course_wishlist_entries')
      .delete()
      .eq('course_id', input.courseId)
      .eq('learner_user_id', input.learnerUserId);

    if (error) {
      throw error;
    }
  }

  async listWishlistEntriesForLearner(learnerUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_wishlist_entries')
      .select('*')
      .eq('learner_user_id', learnerUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return ((data ?? []) as CourseWishlistEntryRow[]).map(mapCourseWishlistEntry);
  }

  async listMostSavedCourses(limit: number) {
    const { data: wishlistRows, error: wishlistError } = await this.serviceSupabase
      .from('course_wishlist_entries')
      .select('course_id')
      .limit(Math.max(limit * 20, limit));

    if (wishlistError) {
      throw wishlistError;
    }

    const countByCourseId = new Map<string, number>();
    for (const row of wishlistRows ?? []) {
      countByCourseId.set(row.course_id, (countByCourseId.get(row.course_id) ?? 0) + 1);
    }

    const topCourseIds = [...countByCourseId.entries()]
      .sort((left, right) => right[1] - left[1])
      .slice(0, limit)
      .map(([courseId]) => courseId);

    if (topCourseIds.length === 0) {
      return [];
    }

    const { data: courseRows, error: courseError } = await this.serviceSupabase
      .from('courses')
      .select('id, title, creator_user_id')
      .in('id', topCourseIds);

    if (courseError) {
      throw courseError;
    }

    const { data: creatorRows, error: creatorError } = await this.serviceSupabase
      .from('user_profiles')
      .select('user_id, full_name')
      .in(
        'user_id',
        Array.from(new Set((courseRows ?? []).map((course) => course.creator_user_id)))
      );

    if (creatorError) {
      throw creatorError;
    }

    const creatorNameById = new Map((creatorRows ?? []).map((row) => [row.user_id, row.full_name]));

    return topCourseIds
      .map((courseId) => {
        const course = (courseRows ?? []).find((row) => row.id === courseId);
        if (!course) {
          return null;
        }

        return {
          courseId,
          courseTitle: course.title,
          creatorUserId: course.creator_user_id,
          creatorName: creatorNameById.get(course.creator_user_id) ?? null,
          wishlistCount: countByCourseId.get(courseId) ?? 0,
        };
      })
      .filter((value): value is NonNullable<typeof value> => Boolean(value));
  }
}


