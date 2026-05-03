import type { Viewer, PublicUserSummary } from "@/src/domain/models";
import { createServiceRoleSupabaseClient } from "@/src/infrastructure/supabase/serverClient";

export type SupportCategory = "complaint" | "suggestion";
export type SupportStatus = "open" | "resolved" | "closed";

export type SupportAdminOption = {
  userId: string;
  fullName: string | null;
  profilePhotoUrl: string | null;
  bio: string | null;
};

export type SupportThreadListItem = {
  id: string;
  subject: string | null;
  category: SupportCategory;
  status: SupportStatus;
  createdAt: string;
  createdAtLabel: string;
  updatedAt: string;
  updatedAtLabel: string;
  lastMessagePreview: string;
  targetAdmin: SupportAdminOption | null;
  senderProfile: PublicUserSummary | null;
  replyCount: number;
  unreadCount: number;
};

export type SupportThreadMessage = {
  id: string;
  senderUserId: string;
  body: string;
  createdAt: string;
  createdAtLabel: string;
  editedAt: string | null;
  deletedAt: string | null;
  isDeleted: boolean;
  kind: "initial" | "reply";
  attachmentImageUrl: string | null;
};

export type SupportThreadDetail = SupportThreadListItem & {
  targetUserId: string | null;
  senderUserId: string;
  messages: SupportThreadMessage[];
};

const supportDateFormatter = new Intl.DateTimeFormat('en-GB', {
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  second: '2-digit',
  hour12: false,
  timeZone: 'UTC',
});

function formatSupportTimestamp(value: string | null | undefined) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return supportDateFormatter.format(date);
}

function mapAdminOption(row: any): SupportAdminOption {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    profilePhotoUrl: row.profile_photo_url ?? null,
    bio: row.bio ?? null,
  };
}

function mapPublicProfile(row: any): PublicUserSummary | null {
  if (!row) return null;
  return {
    userId: row.user_id,
    fullName: row.full_name,
    primaryRole: row.primary_role,
    profilePhotoUrl: row.profile_photo_url ?? null,
    bio: row.bio ?? null,
    isBanned: row.is_banned ?? false,
  };
}

async function getAdminOptionsMap(adminIds: string[]) {
  if (adminIds.length === 0) return new Map<string, SupportAdminOption>();
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, profile_photo_url, bio")
    .in("user_id", adminIds);
  if (error) throw error;
  return new Map((data ?? []).map((row: any) => [row.user_id, mapAdminOption(row)]));
}

async function getSenderProfilesMap(userIds: string[]) {
  if (userIds.length === 0) return new Map<string, PublicUserSummary>();
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, primary_role, profile_photo_url, bio, is_banned")
    .in("user_id", userIds);
  if (error) throw error;
  return new Map((data ?? []).map((row: any) => [row.user_id, mapPublicProfile(row)!]));
}

export async function listSupportAdmins() {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from("user_profiles")
    .select("user_id, full_name, profile_photo_url, bio")
    .eq("is_admin", true)
    .eq("is_banned", false)
    .order("full_name", { ascending: true });
  if (error) throw error;
  return (data ?? []).map((row: any) => mapAdminOption(row));
}

export async function markSupportThreadRead(viewer: Viewer, threadId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data: thread, error: threadError } = await supabase
    .from('admin_messages')
    .select('id, sender_user_id, target_user_id')
    .eq('id', threadId)
    .maybeSingle();
  if (threadError) throw threadError;
  if (!thread) return false;

  const isParticipant = thread.sender_user_id === viewer.user.id || thread.target_user_id === viewer.user.id;
  if (!isParticipant) return false;

  const { error } = await supabase
    .from('admin_message_thread_reads')
    .upsert({
      thread_id: threadId,
      user_id: viewer.user.id,
      last_read_at: new Date().toISOString(),
    }, { onConflict: 'thread_id,user_id' });
  if (error) throw error;
  return true;
}

export function getSupportUnreadCountForViewer(_viewer: Viewer, threads: SupportThreadListItem[]) {
  return threads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0);
}

export async function getSupportUnreadCountForViewerFast(viewer: Viewer) {
  const supabase = createServiceRoleSupabaseClient();
  let query = supabase
    .from("admin_messages")
    .select("id, sender_user_id, created_at")
    .order("updated_at", { ascending: false });

  if (viewer.profile.isAdmin) query = query.eq("target_user_id", viewer.user.id);
  else query = query.eq("sender_user_id", viewer.user.id);

  const { data: rows, error } = await query;
  if (error) throw error;

  const threadRows = rows ?? [];
  const threadIds = threadRows.map((row: any) => row.id) as string[];
  if (threadIds.length === 0) return 0;

  const [repliesResult, readsResult] = await Promise.all([
    supabase
      .from("admin_message_replies")
      .select("thread_id, sender_user_id, created_at")
      .in("thread_id", threadIds),
    supabase
      .from("admin_message_thread_reads")
      .select("thread_id, last_read_at")
      .eq("user_id", viewer.user.id)
      .in("thread_id", threadIds),
  ]);

  if (repliesResult.error) throw repliesResult.error;
  if (readsResult.error) throw readsResult.error;

  const lastReadAtMap = new Map<string, number>();
  for (const row of (readsResult.data ?? []) as any[]) {
    lastReadAtMap.set(row.thread_id, new Date(row.last_read_at).getTime());
  }

  let unreadCount = 0;
  for (const row of threadRows as any[]) {
    const lastReadAt = lastReadAtMap.get(row.id) ?? 0;
    const createdAt = new Date(row.created_at).getTime();
    if (row.sender_user_id !== viewer.user.id && createdAt > lastReadAt) {
      unreadCount += 1;
    }
  }

  for (const row of (repliesResult.data ?? []) as any[]) {
    const lastReadAt = lastReadAtMap.get(row.thread_id) ?? 0;
    const createdAt = new Date(row.created_at).getTime();
    if (row.sender_user_id !== viewer.user.id && createdAt > lastReadAt) {
      unreadCount += 1;
    }
  }

  return unreadCount;
}

export async function listSupportThreadsForViewer(viewer: Viewer): Promise<SupportThreadListItem[]> {
  const supabase = createServiceRoleSupabaseClient();
  let query = supabase
    .from("admin_messages")
    .select("id, sender_user_id, subject, message, message_type, target_user_id, status, created_at, updated_at, is_deleted")
    .order("updated_at", { ascending: false });

  if (viewer.profile.isAdmin) query = query.eq("target_user_id", viewer.user.id);
  else query = query.eq("sender_user_id", viewer.user.id);

  const { data, error } = await query;
  if (error) throw error;
  const rows = data ?? [];
  const adminIds = Array.from(new Set(rows.map((r: any) => r.target_user_id).filter(Boolean))) as string[];
  const senderIds = Array.from(new Set(rows.map((r: any) => r.sender_user_id).filter(Boolean))) as string[];
  const threadIds = rows.map((r: any) => r.id) as string[];

  const [adminMap, senderMap, repliesResult, readsResult] = await Promise.all([
    getAdminOptionsMap(adminIds),
    getSenderProfilesMap(senderIds),
    threadIds.length
      ? supabase
          .from("admin_message_replies")
          .select("thread_id, sender_user_id, body, created_at, is_deleted")
          .in("thread_id", threadIds)
          .order('created_at', { ascending: false })
      : Promise.resolve({ data: [], error: null } as any),
    threadIds.length
      ? supabase
          .from('admin_message_thread_reads')
          .select('thread_id, last_read_at')
          .eq('user_id', viewer.user.id)
          .in('thread_id', threadIds)
      : Promise.resolve({ data: [], error: null } as any),
  ]);

  if (repliesResult.error) throw repliesResult.error;
  if (readsResult.error) throw readsResult.error;

  const replyCounts = new Map<string, number>();
  const latestReplyPreview = new Map<string, string>();
  const unreadCounts = new Map<string, number>();
  const lastReadAtMap = new Map<string, number>();

  for (const row of (readsResult.data ?? []) as any[]) {
    lastReadAtMap.set(row.thread_id, new Date(row.last_read_at).getTime());
  }

  for (const row of (repliesResult.data ?? []) as any[]) {
    const threadId = row.thread_id;
    replyCounts.set(threadId, (replyCounts.get(threadId) ?? 0) + 1);
    if (!latestReplyPreview.has(threadId)) {
      latestReplyPreview.set(threadId, row.is_deleted ? 'This message was deleted.' : row.body);
    }
    const lastReadAt = lastReadAtMap.get(threadId) ?? 0;
    const createdAt = new Date(row.created_at).getTime();
    if (row.sender_user_id !== viewer.user.id && createdAt > lastReadAt) {
      unreadCounts.set(threadId, (unreadCounts.get(threadId) ?? 0) + 1);
    }
  }

  return rows.map((row: any) => {
    const lastReadAt = lastReadAtMap.get(row.id) ?? 0;
    const initialCreatedAt = new Date(row.created_at).getTime();
    const baseUnread = row.sender_user_id !== viewer.user.id && initialCreatedAt > lastReadAt ? 1 : 0;

    return {
      id: row.id,
      subject: row.subject,
      category: (row.message_type === "complaint" ? "complaint" : "suggestion") as SupportCategory,
      status: (row.status ?? "open") as SupportStatus,
      createdAt: row.created_at,
      createdAtLabel: formatSupportTimestamp(row.created_at),
      updatedAt: row.updated_at,
      updatedAtLabel: formatSupportTimestamp(row.updated_at),
      lastMessagePreview: latestReplyPreview.get(row.id) ?? (row.is_deleted ? 'This message was deleted.' : row.message),
      targetAdmin: row.target_user_id ? adminMap.get(row.target_user_id) ?? null : null,
      senderProfile: senderMap.get(row.sender_user_id) ?? null,
      replyCount: replyCounts.get(row.id) ?? 0,
      unreadCount: baseUnread + (unreadCounts.get(row.id) ?? 0),
    };
  });
}

export async function getSupportThreadForViewer(viewer: Viewer, threadId: string): Promise<SupportThreadDetail | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data: thread, error } = await supabase
    .from("admin_messages")
    .select("id, sender_user_id, subject, message, message_type, target_user_id, status, created_at, updated_at, attachment_image_url, edited_at, is_deleted, deleted_at")
    .eq("id", threadId)
    .maybeSingle();
  if (error) throw error;
  if (!thread) return null;

  const allowed = viewer.profile.isAdmin ? thread.target_user_id === viewer.user.id : thread.sender_user_id === viewer.user.id;
  if (!allowed) return null;

  const [{ data: replies }, adminMap, senderMap, readStateResult] = await Promise.all([
    supabase
      .from("admin_message_replies")
      .select("id, thread_id, sender_user_id, body, created_at, attachment_image_url, edited_at, is_deleted, deleted_at")
      .eq("thread_id", threadId)
      .order("created_at", { ascending: true }),
    getAdminOptionsMap(thread.target_user_id ? [thread.target_user_id] : []),
    getSenderProfilesMap([thread.sender_user_id]),
    supabase
      .from('admin_message_thread_reads')
      .select('last_read_at')
      .eq('thread_id', threadId)
      .eq('user_id', viewer.user.id)
      .maybeSingle(),
  ]);

  if (readStateResult.error) throw readStateResult.error;
  const lastReadAt = new Date((readStateResult.data as any)?.last_read_at ?? 0).getTime();

  const messages: SupportThreadMessage[] = [
    {
      id: thread.id,
      senderUserId: thread.sender_user_id,
      body: thread.is_deleted ? 'This message was deleted.' : thread.message,
      createdAt: thread.created_at,
      createdAtLabel: formatSupportTimestamp(thread.created_at),
      editedAt: (thread as any).edited_at ?? null,
      deletedAt: (thread as any).deleted_at ?? null,
      isDeleted: Boolean((thread as any).is_deleted),
      kind: "initial",
      attachmentImageUrl: (thread as any).is_deleted ? null : ((thread as any).attachment_image_url ?? null),
    },
    ...((replies ?? []) as any[]).map((row) => ({
      id: row.id,
      senderUserId: row.sender_user_id,
      body: row.is_deleted ? 'This message was deleted.' : row.body,
      createdAt: row.created_at,
      createdAtLabel: formatSupportTimestamp(row.created_at),
      editedAt: row.edited_at ?? null,
      deletedAt: row.deleted_at ?? null,
      isDeleted: Boolean(row.is_deleted),
      kind: "reply" as const,
      attachmentImageUrl: row.is_deleted ? null : (row.attachment_image_url ?? null),
    })),
  ];

  const lastMessagePreview = messages[messages.length - 1]?.body ?? thread.message;
  const unreadCount = messages.reduce((sum, message) => {
    const createdAt = new Date(message.createdAt).getTime();
    if (message.senderUserId === viewer.user.id || createdAt <= lastReadAt) return sum;
    return sum + 1;
  }, 0);

  return {
    id: thread.id,
    subject: thread.subject,
    category: (thread.message_type === "complaint" ? "complaint" : "suggestion") as SupportCategory,
    status: (thread.status ?? "open") as SupportStatus,
    createdAt: thread.created_at,
    createdAtLabel: formatSupportTimestamp(thread.created_at),
    updatedAt: thread.updated_at,
    updatedAtLabel: formatSupportTimestamp(thread.updated_at),
    lastMessagePreview,
    targetAdmin: thread.target_user_id ? adminMap.get(thread.target_user_id) ?? null : null,
    senderProfile: senderMap.get(thread.sender_user_id) ?? null,
    replyCount: (replies ?? []).length,
    unreadCount,
    targetUserId: thread.target_user_id,
    senderUserId: thread.sender_user_id,
    messages,
  };
}

