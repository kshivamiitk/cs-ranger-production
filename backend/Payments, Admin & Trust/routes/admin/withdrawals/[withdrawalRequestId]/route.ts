import { z } from 'zod';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, ok } from '@/src/presentation/http/routeUtils';

const bodySchema = z.object({
  status: z.enum(['paid', 'rejected']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ withdrawalRequestId: string }> }
) {
  try {
    const { withdrawalRequestId } = await context.params;
    const parsed = bodySchema.parse(await request.json());
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const withdrawal = await adminFinanceService.updateWithdrawalStatus(viewer, {
      withdrawalRequestId,
      status: parsed.status,
    });
    return ok({ withdrawal });
  } catch (error) {
    return failure(error);
  }
}


