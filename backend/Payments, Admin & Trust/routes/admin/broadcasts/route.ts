import { z } from 'zod';

import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { ok, failure, readJsonWithLimit } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { optionalHttpsOrInternalUrlSchema } from '@/src/presentation/schemas';

const optionalImage = z.string().trim().max(1024 * 1024 * 2).refine((value) => {
  if (value.length === 0) return true;
  if (/^data:image\/(?:png|jpe?g|webp|gif);base64,/i.test(value)) return true;
  try {
    return new URL(value).protocol === 'https:';
  } catch {
    return false;
  }
}, 'Enter an HTTPS image URL or upload a valid image.').transform((value) => (value.length === 0 ? null : value));
const schema = z.object({
  title: z.string().trim().min(3).max(160),
  body: z.string().trim().min(10).max(2000),
  imageUrl: optionalImage,
  ctaLabel: z.string().trim().max(80).transform((value) => (value.length === 0 ? null : value)),
  ctaHref: optionalHttpsOrInternalUrlSchema,
  audience: z.enum(['all', 'learners', 'creators', 'admins']),
  isActive: z.boolean(),
});

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const parsed = schema.parse(await readJsonWithLimit(request, 2 * 1024 * 1024 + 8192));
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
    return failure(error, request);
  }
}

