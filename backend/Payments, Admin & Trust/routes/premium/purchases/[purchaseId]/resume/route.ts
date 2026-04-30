import { ok, failure } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';

export async function POST(
  _request: Request,
  context: { params: Promise<{ purchaseId: string }> }
) {
  try {
    const { purchaseId } = await context.params;
    const { authService, premiumPaymentService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const result = await premiumPaymentService.resumePendingOrder(viewer, purchaseId);
    return ok(result);
  } catch (error) {
    return failure(error);
  }
}


