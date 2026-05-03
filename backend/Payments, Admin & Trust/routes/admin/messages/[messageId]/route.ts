import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { ok, failure, readJsonWithLimit } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { adminMessageStatusSchema } from '@/src/presentation/schemas';

export async function PATCH(
  request: Request,
  context: { params: Promise<{ messageId: string }> }
) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const { messageId } = await context.params;
    const parsed = adminMessageStatusSchema.parse(await readJsonWithLimit(request, 8 * 1024));
    const { authService, adminMessageService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireAdmin();
    const message = await adminMessageService.updateMessageStatus(viewer, {
      messageId,
      status: parsed.status,
    });
    return ok({ message });
  } catch (error) {
    return failure(error, request);
  }
}

