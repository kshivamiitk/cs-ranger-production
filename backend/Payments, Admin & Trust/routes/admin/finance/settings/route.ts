import { createServerContainer } from '@/src/infrastructure/container/server';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { failure, ok, readJsonWithLimit } from '@/src/presentation/http/routeUtils';
import { adminFinanceSettingsSchema } from '@/src/presentation/schemas';

export async function PATCH(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const parsed = adminFinanceSettingsSchema.parse(await readJsonWithLimit(request, 16 * 1024));
    const { authService, adminFinanceService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const settings = await adminFinanceService.updateSettings(viewer, parsed);
    return ok({ settings });
  } catch (error) {
    return failure(error, request);
  }
}

