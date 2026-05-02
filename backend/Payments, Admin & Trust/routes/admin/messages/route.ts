import { ok, failure } from '@/src/presentation/http/routeUtils';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { readJsonWithLimit } from '@/src/presentation/http/routeUtils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { adminMessageSchema } from '@/src/presentation/schemas';

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'admin');
    if (rateLimited) return rateLimited;

    const parsed = adminMessageSchema.parse(await readJsonWithLimit(request, 32 * 1024));
    const { authService, adminMessageService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const message = await adminMessageService.createMessage(viewer, parsed);
    return ok({ message });
  } catch (error) {
    return failure(error, request);
  }
}

