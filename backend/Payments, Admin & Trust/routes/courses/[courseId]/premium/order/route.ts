import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { premiumOrderSchema } from '@/src/presentation/schemas';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const rawBody = await request.text();
    const parsed = premiumOrderSchema.parse(rawBody ? JSON.parse(rawBody) : {});
    const { authService, premiumPaymentService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const result = await premiumPaymentService.createOrder(viewer, courseId, {
      durationMultiplier: parsed.durationMultiplier,
      pricingPlanId: parsed.pricingPlanId,
    });
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}


