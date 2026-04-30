import type { Viewer } from '@/src/domain/models';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

export type AdminBroadcastAudience = 'all' | 'learners' | 'creators' | 'admins';

export type AdminBroadcast = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  ctaLabel: string | null;
  ctaHref: string | null;
  audience: AdminBroadcastAudience;
  isActive: boolean;
  createdByAdminUserId: string;
  createdAt: string;
  updatedAt: string;
};

function mapBroadcast(row: any): AdminBroadcast {
  return {
    id: row.id,
    title: row.title,
    body: row.body,
    imageUrl: row.image_url ?? null,
    ctaLabel: row.cta_label ?? null,
    ctaHref: row.cta_href ?? null,
    audience: (row.audience ?? 'all') as AdminBroadcastAudience,
    isActive: Boolean(row.is_active),
    createdByAdminUserId: row.created_by_admin_user_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function broadcastMatchesViewerAudience(viewer: Viewer, audience: AdminBroadcastAudience) {
  if (audience === 'all') return true;
  if (audience === 'admins') return viewer.profile.isAdmin;
  if (viewer.profile.isAdmin) return false;
  if (audience === 'creators') return viewer.profile.primaryRole === 'creator';
  if (audience === 'learners') return viewer.profile.primaryRole === 'learner';
  return false;
}

export async function listAdminBroadcasts(): Promise<AdminBroadcast[]> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('admin_broadcasts')
    .select('*')
    .order('updated_at', { ascending: false });

  if (error) throw error;
  return (data ?? []).map(mapBroadcast);
}

export async function listBroadcastsForViewer(viewer: Viewer): Promise<AdminBroadcast[]> {
  const broadcasts = await listAdminBroadcasts();
  return broadcasts.filter((broadcast) => broadcast.isActive && broadcastMatchesViewerAudience(viewer, broadcast.audience));
}


