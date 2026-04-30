import type { CourseReviewRepository } from '@/src/domain/ports';
import type { CourseReview, CourseReviewSummary, CourseReviewViewItem } from '@/src/domain/models';
import { mapCourseReview, mapPublicUserSummary } from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';

type CourseReviewRow = Database['public']['Tables']['course_reviews']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

const reviewSelect =
  'id, course_id, reviewer_user_id, rating, review_text, is_edited, is_deleted, created_at, updated_at';
const publicUserSelect = 'user_id, full_name, primary_role, profile_photo_url, bio, is_banned';

export class SupabaseCourseReviewRepository implements CourseReviewRepository {
  constructor(
    private readonly _supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async listCourseReviews(input: { courseId: string; viewerUserId: string | null }) {
    const { data, error } = await this.serviceSupabase
      .from('course_reviews')
      .select(reviewSelect)
      .eq('course_id', input.courseId)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as CourseReviewRow[];
    if (rows.length === 0) {
      return [];
    }

    const reviewerIds = Array.from(new Set(rows.map((row) => row.reviewer_user_id)));
    const { data: reviewerRows, error: reviewerError } = await this.serviceSupabase
      .from('user_profiles')
      .select(publicUserSelect)
      .in('user_id', reviewerIds);

    if (reviewerError) {
      throw reviewerError;
    }

    const reviewerMap = new Map(
      ((reviewerRows ?? []) as UserProfileRow[]).map((row) => [row.user_id, mapPublicUserSummary(row)])
    );

    return rows.map((row) => {
      const review = mapCourseReview(row);
      return {
        ...review,
        reviewer: reviewerMap.get(row.reviewer_user_id) ?? null,
        canEdit: input.viewerUserId === review.reviewerUserId,
        canDelete: input.viewerUserId === review.reviewerUserId,
      } satisfies CourseReviewViewItem;
    });
  }

  async getCourseReviewSummary(courseId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_reviews')
      .select('rating')
      .eq('course_id', courseId)
      .eq('is_deleted', false);

    if (error) {
      throw error;
    }

    const ratings = (data ?? []).map((row) => row.rating).filter((rating) => Number.isFinite(rating));
    const totalReviews = ratings.length;
    const averageRating =
      totalReviews > 0 ? Number((ratings.reduce((sum, rating) => sum + rating, 0) / totalReviews).toFixed(2)) : 0;
    const ratingBreakdown: CourseReviewSummary['ratingBreakdown'] = {
      1: 0,
      2: 0,
      3: 0,
      4: 0,
      5: 0,
    };

    for (const rating of ratings) {
      if (rating >= 1 && rating <= 5) {
        ratingBreakdown[rating as 1 | 2 | 3 | 4 | 5] += 1;
      }
    }

    return {
      courseId,
      averageRating,
      totalReviews,
      ratingBreakdown,
    } satisfies CourseReviewSummary;
  }

  async upsertCourseReview(input: {
    courseId: string;
    reviewerUserId: string;
    rating: number;
    reviewText: string | null;
  }) {
    const { data: existingRow, error: existingError } = await this.serviceSupabase
      .from('course_reviews')
      .select(reviewSelect)
      .eq('course_id', input.courseId)
      .eq('reviewer_user_id', input.reviewerUserId)
      .maybeSingle();

    if (existingError) {
      throw existingError;
    }

    if (existingRow) {
      const { data, error } = await this.serviceSupabase
        .from('course_reviews')
        .update({
          rating: input.rating,
          review_text: input.reviewText,
          is_edited: true,
          is_deleted: false,
        })
        .eq('id', existingRow.id)
        .eq('reviewer_user_id', input.reviewerUserId)
        .select(reviewSelect)
        .single();

      if (error) {
        throw error;
      }

      return mapCourseReview(data as CourseReviewRow);
    }

    const { data, error } = await this.serviceSupabase
      .from('course_reviews')
      .insert({
        course_id: input.courseId,
        reviewer_user_id: input.reviewerUserId,
        rating: input.rating,
        review_text: input.reviewText,
        is_edited: false,
        is_deleted: false,
      })
      .select(reviewSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapCourseReview(data as CourseReviewRow);
  }

  async softDeleteCourseReview(reviewId: string, actorUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_reviews')
      .update({
        is_deleted: true,
      })
      .eq('id', reviewId)
      .eq('reviewer_user_id', actorUserId)
      .select(reviewSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapCourseReview(data as CourseReviewRow);
  }

  async getReviewerReviewForCourse(courseId: string, reviewerUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_reviews')
      .select(reviewSelect)
      .eq('course_id', courseId)
      .eq('reviewer_user_id', reviewerUserId)
      .eq('is_deleted', false)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCourseReview(data as CourseReviewRow) : null;
  }

  async canUserReviewCourse(input: { courseId: string; userId: string }) {
    const { data, error } = await this.serviceSupabase.rpc('can_user_review_course', {
      target_course_id: input.courseId,
      target_user_id: input.userId,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  }
}


