import { z } from 'zod';

import { createServerContainer } from '@/src/infrastructure/container/server';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { failure, ok, readJsonWithLimit } from '@/src/presentation/http/routeUtils';

const bodySchema = z.object({
  status: z.enum(['paid', 'rejected']),
});

export async function PATCH(
  request: Request,
  context: { params: Promise<{ withdrawalRequestId: string }> }
) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const { withdrawalRequestId } = await context.params;
    const parsed = bodySchema.parse(await readJsonWithLimit(request, 8 * 1024));
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const withdrawal = await adminFinanceService.updateWithdrawalStatus(viewer, {
      withdrawalRequestId,
      status: parsed.status,
    });
    return ok({ withdrawal });
  } catch (error) {
    return failure(error, request);
  }
}

