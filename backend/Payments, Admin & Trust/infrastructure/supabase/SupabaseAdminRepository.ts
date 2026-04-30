import type { AdminRepository } from '@/src/domain/ports';
import type { AdminMessageDetail, PublicUserSummary, UserRole } from '@/src/domain/models';
import { mapAdminMessage, mapAdminModerationAction, mapPublicUserSummary } from '@/src/infrastructure/supabase/mappers';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';

type AdminMessageRow = Database['public']['Tables']['admin_messages']['Row'];
type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];

const adminMessageSelect = 'id, sender_user_id, sender_role, subject, message, message_type, target_user_id, status, reviewed_by_admin_user_id, reviewed_at, attachment_image_url, edited_at, is_deleted, deleted_at, created_at, updated_at';
const publicUserSelect = 'user_id, full_name, primary_role, profile_photo_url, bio, is_banned';

export class SupabaseAdminRepository implements AdminRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  async createAdminMessage(input: {
    senderUserId: string;
    senderRole: UserRole;
    subject: string | null;
    message: string;
    messageType: 'suggestion' | 'complaint' | 'support';
    targetUserId: string | null;
  }) {
    const { data, error } = await this.supabase
      .from('admin_messages')
      .insert({
        sender_user_id: input.senderUserId,
        sender_role: input.senderRole,
        subject: input.subject,
        message: input.message,
        message_type: input.messageType,
        target_user_id: input.targetUserId,
      })
      .select(adminMessageSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapAdminMessage(data);
  }

  async listSenderMessages(senderUserId: string) {
    const { data, error } = await this.supabase
      .from('admin_messages')
      .select(adminMessageSelect)
      .eq('sender_user_id', senderUserId)
      .order('created_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapAdminMessage);
  }

  async listAdminMessages(input?: { senderRole?: UserRole; status?: 'open' | 'reviewed' | 'closed' | null }) {
    let query = this.serviceSupabase
      .from('admin_messages')
      .select(adminMessageSelect)
      .order('created_at', { ascending: false });

    if (input?.senderRole) {
      query = query.eq('sender_role', input.senderRole);
    }

    if (input?.status) {
      query = query.eq('status', input.status);
    }

    const { data, error } = await query;

    if (error) {
      throw error;
    }

    return this.attachProfiles(data ?? []);
  }

  async getAdminMessageDetail(messageId: string) {
    const { data, error } = await this.serviceSupabase
      .from('admin_messages')
      .select(adminMessageSelect)
      .eq('id', messageId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (!data) {
      return null;
    }

    const [detail] = await this.attachProfiles([data]);
    return detail ?? null;
  }

  async updateAdminMessageStatus(input: {
    messageId: string;
    status: 'open' | 'reviewed' | 'closed';
    reviewedByAdminUserId: string;
  }) {
    const reviewedAt = input.status === 'open' ? null : new Date().toISOString();
    const reviewedByAdminUserId = input.status === 'open' ? null : input.reviewedByAdminUserId;

    const { data, error } = await this.serviceSupabase
      .from('admin_messages')
      .update({
        status: input.status,
        reviewed_by_admin_user_id: reviewedByAdminUserId,
        reviewed_at: reviewedAt,
      })
      .eq('id', input.messageId)
      .select(adminMessageSelect)
      .single();

    if (error) {
      throw error;
    }

    return mapAdminMessage(data);
  }

  async createModerationAction(input: {
    adminUserId: string;
    targetUserId: string;
    sourceMessageId: string | null;
    actionType: 'ban' | 'unban' | 'warn';
    reason: string | null;
  }) {
    const { data, error } = await this.serviceSupabase
      .from('admin_moderation_actions')
      .insert({
        admin_user_id: input.adminUserId,
        target_user_id: input.targetUserId,
        source_message_id: input.sourceMessageId,
        action_type: input.actionType,
        reason: input.reason,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapAdminModerationAction(data);
  }

  private async attachProfiles(rows: AdminMessageRow[]): Promise<AdminMessageDetail[]> {
    if (rows.length === 0) {
      return [];
    }

    const userIds = Array.from(
      new Set(
        rows.flatMap((row) => [row.sender_user_id, row.target_user_id, row.reviewed_by_admin_user_id].filter(Boolean) as string[])
      )
    );

    const { data: userProfiles, error } = await this.serviceSupabase
      .from('user_profiles')
      .select(publicUserSelect)
      .in('user_id', userIds);

    if (error) {
      throw error;
    }

    const profileMap = new Map<string, PublicUserSummary>();
    for (const profile of userProfiles ?? []) {
      profileMap.set(profile.user_id, mapPublicUserSummary(profile as UserProfileRow));
    }

    return rows.map((row) => ({
      ...mapAdminMessage(row),
      senderProfile: profileMap.get(row.sender_user_id) ?? null,
      targetProfile: row.target_user_id ? profileMap.get(row.target_user_id) ?? null : null,
      reviewedByProfile: row.reviewed_by_admin_user_id ? profileMap.get(row.reviewed_by_admin_user_id) ?? null : null,
    }));
  }
}

