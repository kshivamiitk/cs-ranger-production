import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { resetPasswordSchema } from '@/src/presentation/schemas';
import { failure, readJsonWithLimit, safeNextPath } from '@/src/presentation/http/routeUtils';

const AUTH_BODY_LIMIT_BYTES = 8 * 1024;

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const body = await readJsonWithLimit(request, AUTH_BODY_LIMIT_BYTES);
    const parsed = resetPasswordSchema.parse(body);
    const nextPath = safeNextPath(typeof (body as { next?: unknown })?.next === 'string' ? (body as { next: string }).next : null);
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    await authService.updatePassword(viewer, parsed.password);

    const response = NextResponse.json({
      redirectTo: viewer.profile.isBanned ? '/blocked' : nextPath,
    });
    applyViewerCookies(response, viewer);
    return response;
  } catch (error) {
    return failure(error, request);
  }
}

