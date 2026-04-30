import { createServiceRoleSupabaseClient } from "@/src/infrastructure/supabase/serverClient";
import type { AdminIntroImageFocus } from '@/components/admin/AdminIntroCardPreview';

export type AdminIntroCard = {
  id: string;
  title: string;
  body: string;
  imageUrl: string | null;
  imageFocus: AdminIntroImageFocus;
  ctaLabel: string | null;
  ctaHref: string | null;
  isActive: boolean;
  createdByAdminUserId: string;
  createdAt: string;
  updatedAt: string;
};

export async function getActiveAdminIntroCard(): Promise<AdminIntroCard | null> {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('admin_intro_cards')
    .select('*')
    .eq('is_active', true)
    .order('updated_at', { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  if (!data) return null;
  return {
    id: (data as any).id,
    title: (data as any).title,
    body: (data as any).body,
    imageUrl: (data as any).image_url ?? null,
    imageFocus: ((data as any).image_focus ?? 'center') as AdminIntroImageFocus,
    ctaLabel: (data as any).cta_label ?? null,
    ctaHref: (data as any).cta_href ?? null,
    isActive: Boolean((data as any).is_active),
    createdByAdminUserId: (data as any).created_by_admin_user_id,
    createdAt: (data as any).created_at,
    updatedAt: (data as any).updated_at,
  };
}


