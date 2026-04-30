import { z } from 'zod';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { ok, failure } from '@/src/presentation/http/routeUtils';
import { cachedValue } from '@/shared/performance/apiCache';
import {
  invalidateLearnerCreatorReadCaches,
  learnerCreatorCacheKey,
  learnerCreatorCacheTtlMs,
} from '@/src/performance/learnerCreatorCache';

const createPlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  priceAmount: z.coerce.number().min(0).max(999999),
  accessDays: z.coerce.number().int().min(1).max(3650),
});

async function requireOwnedCourse(courseId: string, creatorUserId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('courses')
    .select('id')
    .eq('id', courseId)
    .eq('creator_user_id', creatorUserId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Course not found or not owned by the active creator.');

  return supabase;
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const { authService } = await createServerContainer();
    const viewer = await authService.requireViewer();
    const cacheKey = learnerCreatorCacheKey(['pricing-plans', 'creator', viewer.user.id, courseId]);
    const payload = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.pricingPlans, async () => {
      const supabase = await requireOwnedCourse(courseId, viewer.user.id);
      const { data, error } = await supabase
        .from('course_pricing_plans')
        .select('*')
        .eq('course_id', courseId)
        .order('position', { ascending: true });

      if (error) throw error;
      return { plans: data ?? [] };
    });

    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = createPlanSchema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const supabase = await requireOwnedCourse(courseId, viewer.user.id);

    const { data: existing, error: listError } = await supabase
      .from('course_pricing_plans')
      .select('position')
      .eq('course_id', courseId)
      .order('position', { ascending: false })
      .limit(1);

    if (listError) throw listError;

    const nextPosition = (existing?.[0]?.position ?? 0) + 1;
    const { data, error } = await supabase
      .from('course_pricing_plans')
      .insert({
        course_id: courseId,
        title: parsed.title,
        description: parsed.description ?? null,
        price_amount: parsed.priceAmount,
        access_days: parsed.accessDays,
        position: nextPosition,
        is_active: true,
      })
      .select('*')
      .single();

    if (error) throw error;
    invalidateLearnerCreatorReadCaches({ userId: viewer.user.id, courseId });

    return ok({ plan: data });
  } catch (error) {
    return failure(error);
  }
}
