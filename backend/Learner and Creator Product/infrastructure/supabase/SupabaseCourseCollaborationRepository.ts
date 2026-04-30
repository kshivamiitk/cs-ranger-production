import { ApplicationError } from '@/src/application/errors';
import type {
  CourseCollaborator,
  CourseCollaboratorAccess,
  CourseCollaboratorInvite,
  PublicUserSummary,
} from '@/src/domain/models';
import type { CourseCollaborationRepository } from '@/src/domain/ports';
import { mapPublicUserSummary } from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';

type CourseRow = Database['public']['Tables']['courses']['Row'];
type CollaboratorRow = Database['public']['Tables']['course_collaborators']['Row'];
type InviteRow = Database['public']['Tables']['course_collaborator_invites']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

const publicProfileSelect = 'user_id, full_name, username, primary_role, profile_photo_url, bio, is_banned';

export class SupabaseCourseCollaborationRepository implements CourseCollaborationRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient,
  ) {}

  async getCourseAccess(input: { courseId: string; userId: string }): Promise<CourseCollaboratorAccess> {
    const course = await this.getCourseRow(input.courseId);
    if (!course) {
      return {
        courseId: input.courseId,
        userId: input.userId,
        isOwner: false,
        collaboratorRole: null,
        canEditContent: false,
        canManageCollaborators: false,
        canManageSettings: false,
      };
    }

    if (course.creator_user_id === input.userId) {
      return {
        courseId: input.courseId,
        userId: input.userId,
        isOwner: true,
        collaboratorRole: null,
        canEditContent: true,
        canManageCollaborators: true,
        canManageSettings: true,
      };
    }

    const { data, error } = await this.serviceSupabase
      .from('course_collaborators')
      .select('role')
      .eq('course_id', input.courseId)
      .eq('collaborator_user_id', input.userId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    const role = data?.role ?? null;

    return {
      courseId: input.courseId,
      userId: input.userId,
      isOwner: false,
      collaboratorRole: role,
      canEditContent: Boolean(role),
      canManageCollaborators: false,
      canManageSettings: false,
    };
  }

  async listAccessibleCourseIds(userId: string): Promise<string[]> {
    const [{ data: ownedRows, error: ownedError }, { data: collaboratorRows, error: collaboratorError }] = await Promise.all([
      this.serviceSupabase.from('courses').select('id').eq('creator_user_id', userId).order('updated_at', { ascending: false }),
      this.serviceSupabase.from('course_collaborators').select('course_id').eq('collaborator_user_id', userId).order('created_at', { ascending: false }),
    ]);

    if (ownedError) throw ownedError;
    if (collaboratorError) throw collaboratorError;

    const orderedIds = [
      ...(ownedRows ?? []).map((row) => row.id),
      ...(collaboratorRows ?? []).map((row) => row.course_id),
    ];

    return Array.from(new Set(orderedIds));
  }

  async listCourseCollaborators(courseId: string): Promise<CourseCollaborator[]> {
    const { data, error } = await this.serviceSupabase
      .from('course_collaborators')
      .select('*')
      .eq('course_id', courseId)
      .order('created_at', { ascending: true });

    if (error) {
      throw error;
    }

    const rows = (data ?? []) as CollaboratorRow[];
    const profiles = await this.loadProfiles(rows.map((row) => row.collaborator_user_id));

    return rows.map((row) => ({
      courseId: row.course_id,
      userId: row.collaborator_user_id,
      role: row.role,
      addedByUserId: row.added_by_user_id,
      createdAt: row.created_at,
      user: profiles.get(row.collaborator_user_id) ?? null,
    }));
  }

  async listCoursePendingInvites(courseId: string): Promise<CourseCollaboratorInvite[]> {
    const { data, error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .select('*')
      .eq('course_id', courseId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return this.mapInvites(data ?? []);
  }

  async listIncomingInvites(userId: string): Promise<CourseCollaboratorInvite[]> {
    const { data, error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .select('*')
      .eq('invitee_user_id', userId)
      .eq('status', 'pending')
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return this.mapInvites(data ?? []);
  }

  async inviteCollaborator(input: {
    courseId: string;
    inviterUserId: string;
    inviteeUserId: string;
    role?: 'editor';
    message?: string | null;
  }): Promise<CourseCollaboratorInvite> {
    const course = await this.requireCourse(input.courseId);
    if (course.creator_user_id !== input.inviterUserId) {
      throw new ApplicationError('Only the course owner can invite collaborators.', 403);
    }

    if (course.creator_user_id === input.inviteeUserId) {
      throw new ApplicationError('You already own this course.', 400);
    }

    const invitee = await this.requireCreatorProfile(input.inviteeUserId);
    if (invitee.isBanned) {
      throw new ApplicationError('Blocked creators cannot be invited.', 400);
    }

    const access = await this.getCourseAccess({ courseId: input.courseId, userId: input.inviteeUserId });
    if (access.canEditContent) {
      throw new ApplicationError('This creator is already a collaborator on the course.', 400);
    }

    const existingInviteResponse = await this.serviceSupabase
      .from('course_collaborator_invites')
      .select('id')
      .eq('course_id', input.courseId)
      .eq('invitee_user_id', input.inviteeUserId)
      .eq('status', 'pending')
      .maybeSingle();

    if (existingInviteResponse.error) {
      throw existingInviteResponse.error;
    }

    if (existingInviteResponse.data?.id) {
      throw new ApplicationError('A pending invite already exists for this creator.', 400);
    }

    const { data, error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .insert({
        course_id: input.courseId,
        inviter_user_id: input.inviterUserId,
        invitee_user_id: input.inviteeUserId,
        role: input.role ?? 'editor',
        status: 'pending',
        message: input.message ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return (await this.mapInvites([data]))[0];
  }

  async acceptInvite(input: { inviteId: string; userId: string }): Promise<CourseCollaboratorInvite> {
    const invite = await this.requireInvite(input.inviteId);
    if (invite.invitee_user_id !== input.userId) {
      throw new ApplicationError('You cannot accept another creator’s invite.', 403);
    }
    if (invite.status !== 'pending') {
      throw new ApplicationError('This collaboration request is no longer pending.', 400);
    }

    const { error: collaboratorError } = await this.serviceSupabase
      .from('course_collaborators')
      .upsert(
        {
          course_id: invite.course_id,
          collaborator_user_id: invite.invitee_user_id,
          role: invite.role,
          added_by_user_id: invite.inviter_user_id,
        },
        { onConflict: 'course_id,collaborator_user_id' },
      );

    if (collaboratorError) {
      throw collaboratorError;
    }

    const { error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .update({ status: 'accepted', responded_at: new Date().toISOString() })
      .eq('id', input.inviteId);

    if (error) {
      throw error;
    }

    return this.fetchInvite(input.inviteId);
  }

  async declineInvite(input: { inviteId: string; userId: string }): Promise<CourseCollaboratorInvite> {
    const invite = await this.requireInvite(input.inviteId);
    if (invite.invitee_user_id !== input.userId) {
      throw new ApplicationError('You cannot decline another creator’s invite.', 403);
    }
    if (invite.status !== 'pending') {
      throw new ApplicationError('This collaboration request is no longer pending.', 400);
    }

    const { error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .update({ status: 'declined', responded_at: new Date().toISOString() })
      .eq('id', input.inviteId);

    if (error) {
      throw error;
    }

    return this.fetchInvite(input.inviteId);
  }

  async revokeInvite(input: { inviteId: string; userId: string }): Promise<CourseCollaboratorInvite> {
    const invite = await this.requireInvite(input.inviteId);
    const course = await this.requireCourse(invite.course_id);
    if (course.creator_user_id !== input.userId) {
      throw new ApplicationError('Only the course owner can revoke invites.', 403);
    }
    if (invite.status !== 'pending') {
      throw new ApplicationError('Only pending invites can be revoked.', 400);
    }

    const { error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .update({ status: 'revoked', responded_at: new Date().toISOString() })
      .eq('id', input.inviteId);

    if (error) {
      throw error;
    }

    return this.fetchInvite(input.inviteId);
  }

  async removeCollaborator(input: { courseId: string; actorUserId: string; collaboratorUserId: string }): Promise<void> {
    const course = await this.requireCourse(input.courseId);
    if (course.creator_user_id !== input.actorUserId) {
      throw new ApplicationError('Only the course owner can remove collaborators.', 403);
    }

    const { error } = await this.serviceSupabase
      .from('course_collaborators')
      .delete()
      .eq('course_id', input.courseId)
      .eq('collaborator_user_id', input.collaboratorUserId);

    if (error) {
      throw error;
    }
  }

  private async fetchInvite(inviteId: string) {
    const invite = await this.requireInvite(inviteId);
    return (await this.mapInvites([invite]))[0];
  }

  private async mapInvites(rows: InviteRow[]): Promise<CourseCollaboratorInvite[]> {
    if (rows.length === 0) {
      return [];
    }

    const profileIds = Array.from(new Set(rows.flatMap((row) => [row.inviter_user_id, row.invitee_user_id])));
    const profiles = await this.loadProfiles(profileIds);
    const courseIds = Array.from(new Set(rows.map((row) => row.course_id)));
    const titles = await this.loadCourseTitles(courseIds);

    return rows.map((row) => ({
      id: row.id,
      courseId: row.course_id,
      courseTitle: titles.get(row.course_id) ?? null,
      inviterUserId: row.inviter_user_id,
      inviteeUserId: row.invitee_user_id,
      role: row.role,
      status: row.status,
      message: row.message,
      createdAt: row.created_at,
      respondedAt: row.responded_at,
      inviter: profiles.get(row.inviter_user_id) ?? null,
      invitee: profiles.get(row.invitee_user_id) ?? null,
    }));
  }

  private async loadProfiles(userIds: string[]): Promise<Map<string, PublicUserSummary>> {
    const uniqueIds = Array.from(new Set(userIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .select(publicProfileSelect)
      .in('user_id', uniqueIds);

    if (error) {
      throw error;
    }

    return new Map(
      ((data ?? []) as Array<Pick<UserProfileRow, 'user_id' | 'full_name' | 'username' | 'primary_role' | 'profile_photo_url' | 'bio' | 'is_banned'>>)
        .map((row) => [row.user_id, mapPublicUserSummary(row)]),
    );
  }

  private async loadCourseTitles(courseIds: string[]): Promise<Map<string, string>> {
    const uniqueIds = Array.from(new Set(courseIds.filter(Boolean)));
    if (uniqueIds.length === 0) {
      return new Map();
    }

    const { data, error } = await this.serviceSupabase
      .from('courses')
      .select('id, title')
      .in('id', uniqueIds);

    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.id, row.title]));
  }

  private async getCourseRow(courseId: string): Promise<CourseRow | null> {
    const { data, error } = await this.serviceSupabase.from('courses').select('*').eq('id', courseId).maybeSingle();
    if (error) {
      throw error;
    }
    return data ?? null;
  }

  private async requireCourse(courseId: string): Promise<CourseRow> {
    const course = await this.getCourseRow(courseId);
    if (!course) {
      throw new ApplicationError('Course not found.', 404);
    }
    return course;
  }

  private async requireInvite(inviteId: string): Promise<InviteRow> {
    const { data, error } = await this.serviceSupabase
      .from('course_collaborator_invites')
      .select('*')
      .eq('id', inviteId)
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new ApplicationError('Collaboration request not found.', 404);
    }
    return data;
  }

  private async requireCreatorProfile(userId: string) {
    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .select(publicProfileSelect)
      .eq('user_id', userId)
      .eq('primary_role', 'creator')
      .maybeSingle();

    if (error) {
      throw error;
    }
    if (!data) {
      throw new ApplicationError('Creator profile not found for that username.', 404);
    }

    return mapPublicUserSummary(data as any);
  }
}

