import { z } from 'zod';

import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

const optionalText = z.string().trim().max(1024 * 1024 * 2).transform((value) => (value.length === 0 ? null : value));
const schema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(2000),
  imageUrl: optionalText,
  ctaLabel: z.string().trim().max(80).transform((value) => (value.length === 0 ? null : value)),
  ctaHref: z.string().trim().max(400).transform((value) => (value.length === 0 ? null : value)),
  audience: z.enum(['all', 'learners', 'creators', 'admins']),
  isActive: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const parsed = schema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const supabase = createServiceRoleSupabaseClient();

    const { data, error } = await supabase
      .from('admin_broadcasts')
      .insert({
        title: parsed.title,
        body: parsed.body,
        image_url: parsed.imageUrl,
        cta_label: parsed.ctaLabel,
        cta_href: parsed.ctaHref,
        audience: parsed.audience,
        is_active: parsed.isActive,
        created_by_admin_user_id: viewer.user.id,
      })
      .select('*')
      .single();

    if (error) throw error;
    return ok({ broadcast: data });
  } catch (error) {
    return failure(error);
  }
}


