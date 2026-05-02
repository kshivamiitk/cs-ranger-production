import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { ok, failure, readJsonWithLimit } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { moderationActionSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const parsed = moderationActionSchema.parse(await readJsonWithLimit(request, 16 * 1024));
    const { authService, adminModerationService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const result = parsed.actionType === 'ban'
      ? await adminModerationService.banUser(viewer, parsed)
      : await adminModerationService.unbanUser(viewer, parsed);
    return ok(result);
  } catch (error) {
    return failure(error, request);
  }
}

