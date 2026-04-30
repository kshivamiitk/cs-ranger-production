import type { NodeDiscussionRepository } from '@/src/domain/ports';
import type {
  CreatorLearnerDoubtListItem,
  NodeDiscussionCommentView,
  NodeDiscussionPreview,
} from '@/src/domain/models';
import {
  mapNodeDiscussionComment,
  mapNodeDiscussionThread,
  mapPublicUserSummary,
} from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';

type CommentRow = Database['public']['Tables']['node_discussion_comments']['Row'];
type ThreadRow = Database['public']['Tables']['node_discussion_threads']['Row'];
type CourseRow = Database['public']['Tables']['courses']['Row'];
type NodeRow = Database['public']['Tables']['course_nodes']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

const discussionThreadSelect =
  'id, course_id, node_id, creator_user_id, is_open, unresolved_count, last_activity_at, created_at, updated_at';
const commentSelect =
  'id, thread_id, course_id, node_id, author_user_id, parent_comment_id, root_comment_id, comment_tag, body, depth, reply_count, like_count, is_edited, is_deleted, status, resolved_by_user_id, resolved_at, created_at, updated_at';
const publicUserSelect = 'user_id, full_name, primary_role, profile_photo_url, bio, is_banned';

export class SupabaseNodeDiscussionRepository implements NodeDiscussionRepository {
  constructor(
    private readonly _supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async getThreadByNodeId(nodeId: string) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_threads')
      .select(discussionThreadSelect)
      .eq('node_id', nodeId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapNodeDiscussionThread(data) : null;
  }

  async getOrCreateThreadForNode(nodeId: string) {
    const { data, error } = await this.serviceSupabase.rpc('get_or_create_node_discussion_thread', {
      target_node_id: nodeId,
    });

    if (error) {
      throw error;
    }

    return mapNodeDiscussionThread(data);
  }

  async listCommentsByNodeId(input: { nodeId: string; viewerUserId: string | null }) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .select(commentSelect)
      .eq('node_id', input.nodeId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as CommentRow[];
    if (rows.length === 0) {
      return [];
    }

    const authorIds = Array.from(new Set(rows.map((row) => row.author_user_id)));
    const [{ data: authorRows, error: authorError }, likedSet] = await Promise.all([
      this.serviceSupabase
        .from('user_profiles')
        .select(publicUserSelect)
        .in('user_id', authorIds),
      this.loadLikedCommentIds({
        viewerUserId: input.viewerUserId,
        commentIds: rows.map((row) => row.id),
      }),
    ]);

    if (authorError) {
      throw authorError;
    }

    const authorMap = new Map(
      ((authorRows ?? []) as UserProfileRow[]).map((row) => [row.user_id, mapPublicUserSummary(row)])
    );

    return rows.map((row) => ({
      ...mapNodeDiscussionComment(row),
      author: authorMap.get(row.author_user_id) ?? null,
      viewerHasLiked: likedSet.has(row.id),
      canEdit: false,
      canDelete: false,
      canReply: false,
      canResolve: false,
      canReopen: false,
    })) satisfies NodeDiscussionCommentView[];
  }

  async createComment(input: {
    id: string;
    threadId: string;
    courseId: string;
    nodeId: string;
    authorUserId: string;
    parentCommentId: string | null;
    rootCommentId: string;
    commentTag: 'discussion' | 'doubt';
    depth: number;
    body: string;
  }) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .insert({
        id: input.id,
        thread_id: input.threadId,
        course_id: input.courseId,
        node_id: input.nodeId,
        author_user_id: input.authorUserId,
        parent_comment_id: input.parentCommentId,
        root_comment_id: input.rootCommentId,
        comment_tag: input.commentTag,
        body: input.body,
        depth: input.depth,
      })
      .select(commentSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapNodeDiscussionComment(data as CommentRow);
  }

  async updateComment(input: { commentId: string; actorUserId: string; body: string }) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .update({
        body: input.body,
        is_edited: true,
      })
      .eq('id', input.commentId)
      .eq('author_user_id', input.actorUserId)
      .eq('is_deleted', false)
      .select(commentSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapNodeDiscussionComment(data as CommentRow);
  }

  async softDeleteComment(commentId: string, actorUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .update({
        body: '',
        is_deleted: true,
        is_edited: true,
      })
      .eq('id', commentId)
      .eq('author_user_id', actorUserId)
      .select(commentSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapNodeDiscussionComment(data as CommentRow);
  }

  async toggleLike(commentId: string, actorUserId: string) {
    const { data: existingLike, error: existingLikeError } = await this.serviceSupabase
      .from('node_comment_likes')
      .select('comment_id')
      .eq('comment_id', commentId)
      .eq('user_id', actorUserId)
      .maybeSingle();

    if (existingLikeError) {
      throw existingLikeError;
    }

    if (existingLike) {
      const { error: deleteError } = await this.serviceSupabase
        .from('node_comment_likes')
        .delete()
        .eq('comment_id', commentId)
        .eq('user_id', actorUserId);

      if (deleteError) {
        throw deleteError;
      }
    } else {
      const { error: insertError } = await this.serviceSupabase
        .from('node_comment_likes')
        .insert({
          comment_id: commentId,
          user_id: actorUserId,
        });

      if (insertError) {
        throw insertError;
      }
    }

    const { data: commentRow, error: commentError } = await this.serviceSupabase
      .from('node_discussion_comments')
      .select('like_count')
      .eq('id', commentId)
      .single();

    if (commentError) {
      throw commentError;
    }

    return {
      liked: !existingLike,
      likeCount: commentRow.like_count,
    };
  }

  async markRootCommentResolved(commentId: string, actorUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .update({
        status: 'resolved',
        resolved_by_user_id: actorUserId,
        resolved_at: new Date().toISOString(),
      })
      .eq('id', commentId)
      .is('parent_comment_id', null)
      .select(commentSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapNodeDiscussionComment(data as CommentRow);
  }

  async reopenRootComment(commentId: string, actorUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .update({
        status: 'open',
        resolved_by_user_id: actorUserId,
        resolved_at: null,
      })
      .eq('id', commentId)
      .is('parent_comment_id', null)
      .select(commentSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapNodeDiscussionComment(data as CommentRow);
  }

  async listCreatorLearnerDoubts(creatorUserId: string) {
    const { data: threadData, error: threadError } = await this.serviceSupabase
      .from('node_discussion_threads')
      .select('id, course_id, creator_user_id, last_activity_at')
      .eq('creator_user_id', creatorUserId)
      .order('last_activity_at', { ascending: false });

    if (threadError) {
      throw threadError;
    }

    const threads = (threadData ?? []) as Pick<ThreadRow, 'id' | 'course_id' | 'creator_user_id' | 'last_activity_at'>[];
    if (threads.length === 0) {
      return [];
    }

    const threadIds = threads.map((thread) => thread.id);
    const threadMap = new Map(threads.map((thread) => [thread.id, thread]));

    const { data: commentData, error: commentError } = await this.serviceSupabase
      .from('node_discussion_comments')
      .select('id, thread_id, course_id, node_id, author_user_id, parent_comment_id, status, is_deleted, body, created_at, comment_tag')
      .in('thread_id', threadIds)
      .is('parent_comment_id', null)
      .eq('status', 'open')
      .eq('is_deleted', false)
      .eq('comment_tag', 'doubt')
      .order('created_at', { ascending: false });

    if (commentError) {
      throw commentError;
    }

    const comments = (commentData ?? []) as Pick<
      CommentRow,
      | 'id'
      | 'thread_id'
      | 'course_id'
      | 'node_id'
      | 'author_user_id'
      | 'parent_comment_id'
      | 'status'
      | 'is_deleted'
      | 'body'
      | 'created_at'
      | 'comment_tag'
    >[];

    if (comments.length === 0) {
      return [];
    }

    const courseIds = Array.from(new Set(comments.map((comment) => comment.course_id)));
    const nodeIds = Array.from(new Set(comments.map((comment) => comment.node_id)));
    const authorIds = Array.from(new Set(comments.map((comment) => comment.author_user_id)));

    const [
      { data: courseData, error: courseError },
      { data: nodeData, error: nodeError },
      { data: authorData, error: authorError },
    ] = await Promise.all([
      this.serviceSupabase
        .from('courses')
        .select('id, title, creator_user_id')
        .in('id', courseIds),
      this.serviceSupabase
        .from('course_nodes')
        .select('id, title, type')
        .in('id', nodeIds),
      this.serviceSupabase
        .from('user_profiles')
        .select('user_id, full_name')
        .in('user_id', authorIds),
    ]);

    if (courseError) {
      throw courseError;
    }

    if (nodeError) {
      throw nodeError;
    }

    if (authorError) {
      throw authorError;
    }

    const courseMap = new Map(
      (((courseData ?? []) as Pick<CourseRow, 'id' | 'title' | 'creator_user_id'>[])).map((course) => [course.id, course])
    );
    const nodeMap = new Map(
      (((nodeData ?? []) as Pick<NodeRow, 'id' | 'title' | 'type'>[])).map((node) => [node.id, node])
    );
    const authorMap = new Map(
      (((authorData ?? []) as Pick<UserProfileRow, 'user_id' | 'full_name'>[])).map((author) => [author.user_id, author])
    );

    return comments
      .map((comment) => {
        const thread = threadMap.get(comment.thread_id);
        const course = courseMap.get(comment.course_id);
        const node = nodeMap.get(comment.node_id);
        const author = authorMap.get(comment.author_user_id);

        if (!thread || !course || !node) {
          return null;
        }

        return {
          commentId: comment.id,
          threadId: comment.thread_id,
          courseId: comment.course_id,
          courseTitle: course.title,
          courseCreatorUserId: course.creator_user_id,
          nodeId: comment.node_id,
          nodeTitle: node.title,
          nodeType: node.type as CreatorLearnerDoubtListItem['nodeType'],
          learnerUserId: comment.author_user_id,
          learnerName: author?.full_name ?? null,
          parentCommentId: comment.parent_comment_id,
          status: comment.status as CreatorLearnerDoubtListItem['status'],
          isDeleted: comment.is_deleted,
          commentBody: comment.body,
          lastActivityAt: thread.last_activity_at,
          createdAt: comment.created_at,
        } satisfies CreatorLearnerDoubtListItem;
      })
      .filter((item): item is CreatorLearnerDoubtListItem => item !== null)
      .sort((left, right) => {
        const activityDiff =
          new Date(right.lastActivityAt).getTime() - new Date(left.lastActivityAt).getTime();
        if (activityDiff !== 0) {
          return activityDiff;
        }

        return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime();
      });
  }

  async listNodeDiscussionPreview(nodeId: string) {
    const { data: nodeRow, error: nodeError } = await this.serviceSupabase
      .from('course_nodes')
      .select('id, module_id, type, title, is_premium')
      .eq('id', nodeId)
      .maybeSingle();

    if (nodeError) {
      throw nodeError;
    }

    if (!nodeRow) {
      return null;
    }

    const [{ data: moduleRow, error: moduleError }, thread] = await Promise.all([
      this.serviceSupabase
        .from('course_modules')
        .select('id, course_id')
        .eq('id', nodeRow.module_id)
        .single(),
      this.getOrCreateThreadForNode(nodeId),
    ]);

    if (moduleError) {
      throw moduleError;
    }

    const { data: courseRow, error: courseError } = await this.serviceSupabase
      .from('courses')
      .select('id, creator_user_id, title, status, premium_enabled, price_amount, premium_access_days')
      .eq('id', moduleRow.course_id)
      .single();

    if (courseError) {
      throw courseError;
    }

    return {
      nodeId: nodeRow.id,
      nodeTitle: nodeRow.title,
      nodeType: nodeRow.type,
      nodeIsPremium: nodeRow.is_premium,
      courseId: courseRow.id,
      courseTitle: courseRow.title,
      courseStatus: courseRow.status,
      courseCreatorUserId: courseRow.creator_user_id,
      premiumEnabled: courseRow.premium_enabled,
      priceAmount: Number(courseRow.price_amount),
      premiumAccessDays: courseRow.premium_access_days,
      thread,
    } satisfies NodeDiscussionPreview;
  }

  async getCommentById(commentId: string) {
    const { data, error } = await this.serviceSupabase
      .from('node_discussion_comments')
      .select(commentSelect)
      .eq('id', commentId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapNodeDiscussionComment(data as CommentRow) : null;
  }

  async canUserCommentOnNode(input: { nodeId: string; userId: string }) {
    const { data, error } = await this.serviceSupabase.rpc('can_user_comment_on_node', {
      target_node_id: input.nodeId,
      target_user_id: input.userId,
    });

    if (error) {
      throw error;
    }

    return Boolean(data);
  }

  private async loadLikedCommentIds(input: { viewerUserId: string | null; commentIds: string[] }) {
    if (!input.viewerUserId || input.commentIds.length === 0) {
      return new Set<string>();
    }

    const { data, error } = await this.serviceSupabase
      .from('node_comment_likes')
      .select('comment_id')
      .eq('user_id', input.viewerUserId)
      .in('comment_id', input.commentIds);

    if (error) {
      throw error;
    }

    return new Set((data ?? []).map((row) => row.comment_id));
  }
}


