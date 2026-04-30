import type { LearnerFeedEvent, Viewer } from "@/src/domain/models";
import { createServiceRoleSupabaseClient } from "@/src/infrastructure/supabase/serverClient";

export async function getFeedUnreadCountForViewer(viewer: Viewer, items: LearnerFeedEvent[]) {
  if (viewer.profile.isAdmin || items.length === 0) return 0;
  const ids = Array.from(new Set(items.map((item) => item.id).filter(Boolean)));
  if (ids.length === 0) return 0;
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('learner_feed_event_views')
    .select('feed_event_id')
    .eq('learner_user_id', viewer.user.id)
    .in('feed_event_id', ids);
  if (error) throw error;
  const seen = new Set((data ?? []).map((row: any) => row.feed_event_id));
  return ids.filter((id) => !seen.has(id)).length;
}

export async function markFeedItemsSeen(viewer: Viewer, items: LearnerFeedEvent[]) {
  if (viewer.profile.isAdmin || items.length === 0) return;
  const supabase = createServiceRoleSupabaseClient();
  const now = new Date().toISOString();
  const payload = Array.from(new Set(items.map((item) => item.id).filter(Boolean))).map((feedEventId) => ({
    learner_user_id: viewer.user.id,
    feed_event_id: feedEventId,
    seen_at: now,
  }));
  if (payload.length === 0) return;
  const { error } = await supabase
    .from('learner_feed_event_views')
    .upsert(payload, { onConflict: 'learner_user_id,feed_event_id' });
  if (error) throw error;
}


