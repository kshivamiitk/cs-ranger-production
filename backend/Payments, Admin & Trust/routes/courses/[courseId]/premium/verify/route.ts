import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { premiumPaymentVerifySchema } from '@/src/presentation/schemas';

export async function POST(
  request: Request,
  context: { params: Promise<{ courseId: string }> }
) {
  try {
    const { courseId } = await context.params;
    const parsed = premiumPaymentVerifySchema.parse(await request.json());
    const { authService, premiumPaymentService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const finalization = await premiumPaymentService.verifyPayment(viewer, {
      courseId,
      purchaseId: parsed.purchaseId,
      providerOrderId: parsed.providerOrderId,
      providerPaymentId: parsed.providerPaymentId,
      providerSignature: parsed.providerSignature,
    });
    return ok({ finalization });
  } catch (error) {
    return failure(error);
  }
}


