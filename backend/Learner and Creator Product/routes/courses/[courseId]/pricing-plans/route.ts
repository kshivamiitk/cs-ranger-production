import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { ok, failure } from '@/src/presentation/http/routeUtils';
import { cachedValue } from '@/shared/performance/apiCache';
import { learnerCreatorCacheKey, learnerCreatorCacheTtlMs } from '@/src/performance/learnerCreatorCache';

export async function GET(
  _request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const cacheKey = learnerCreatorCacheKey(['pricing-plans', 'public', courseId]);
    const payload = await cachedValue(cacheKey, learnerCreatorCacheTtlMs.pricingPlans, async () => {
      const supabase = createServiceRoleSupabaseClient();
      const { data, error } = await supabase
        .from('course_pricing_plans')
        .select('id, course_id, title, description, price_amount, access_days, position, is_active, created_at, updated_at')
        .eq('course_id', courseId)
        .eq('is_active', true)
        .order('position', { ascending: true });

      if (error) {
        throw error;
      }

      return { plans: data ?? [] };
    });

    return ok(payload);
  } catch (error) {
    return failure(error);
  }
}
