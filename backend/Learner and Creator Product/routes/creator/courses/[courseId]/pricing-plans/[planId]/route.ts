import { z } from 'zod';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { ok, failure } from '@/src/presentation/http/routeUtils';

const updatePlanSchema = z.object({
  title: z.string().trim().min(1).max(120),
  description: z.string().trim().max(500).nullable().optional(),
  priceAmount: z.coerce.number().min(0).max(999999),
  accessDays: z.coerce.number().int().min(1).max(3650),
  isActive: z.boolean().optional().default(true),
});

async function requireOwnedPlan(planId: string, creatorUserId: string) {
  const supabase = createServiceRoleSupabaseClient();
  const { data, error } = await supabase
    .from('course_pricing_plans')
    .select('id, course_id')
    .eq('id', planId)
    .maybeSingle();

  if (error) throw error;
  if (!data) throw new Error('Pricing plan not found or not owned by the active creator.');

  const { data: course, error: courseError } = await supabase
    .from('courses')
    .select('id')
    .eq('id', data.course_id)
    .eq('creator_user_id', creatorUserId)
    .maybeSingle();

  if (courseError) throw courseError;
  if (!course) throw new Error('Pricing plan not found or not owned by the active creator.');
  return supabase;
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ courseId: string; planId: string }> }
) {
  try {
    const { planId } = await context.params;
    const parsed = updatePlanSchema.parse(await request.json());
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const supabase = await requireOwnedPlan(planId, viewer.user.id);

    const { data, error } = await supabase
      .from('course_pricing_plans')
      .update({
        title: parsed.title,
        description: parsed.description ?? null,
        price_amount: parsed.priceAmount,
        access_days: parsed.accessDays,
        is_active: parsed.isActive,
      })
      .eq('id', planId)
      .select('*')
      .single();

    if (error) throw error;
    return ok({ plan: data });
  } catch (error) {
    return failure(error);
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ courseId: string; planId: string }> }
) {
  try {
    const { planId } = await context.params;
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const supabase = await requireOwnedPlan(planId, viewer.user.id);

    const { error } = await supabase
      .from('course_pricing_plans')
      .update({ is_active: false })
      .eq('id', planId);

    if (error) throw error;
    return ok({ success: true });
  } catch (error) {
    return failure(error);
  }
}


