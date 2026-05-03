import { createServerContainer } from '@/src/infrastructure/container/server';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { failure, ok, readJsonWithLimit } from '@/src/presentation/http/routeUtils';
import { adminManualPayoutSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const parsed = adminManualPayoutSchema.parse(await readJsonWithLimit(request, 16 * 1024));
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const withdrawal = await adminFinanceService.createManualWithdrawalRecord(viewer, parsed);
    return ok({ withdrawal });
  } catch (error) {
    return failure(error, request);
  }
}

