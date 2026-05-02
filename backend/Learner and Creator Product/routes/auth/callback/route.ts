import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { cookieNames } from '@/lib/constants';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, safeNextPath } from '@/src/presentation/http/routeUtils';

function redirectToInternalPath(path: string) {
  return new NextResponse(null, {
    status: 307,
    headers: {
      Location: path,
      'Cache-Control': 'no-store',
    },
  });
}

export async function GET(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const url = new URL(request.url);
    const code = url.searchParams.get('code');
    const nextPath = safeNextPath(url.searchParams.get('next'));
    const recovery = url.searchParams.get('recovery') === '1';

    if (!code) {
      return redirectToInternalPath(`/login?next=${encodeURIComponent(nextPath)}`);
    }

    const { authService } = await createServerContainer({ writeCookies: true });

    const viewer = recovery
      ? await authService.completePasswordRecoverySession(code)
      : await authService.completeGoogleOAuth(
          code,
          request.headers.get('cookie')?.includes(`${cookieNames.pendingRole}=creator`) ? 'creator' : 'learner'
        );

    const destination = viewer.profile.isBanned
      ? '/blocked'
      : recovery
        ? `/auth/reset-password?next=${encodeURIComponent(nextPath)}`
        : nextPath;

    const response = redirectToInternalPath(destination);
    applyViewerCookies(response, viewer);
    response.cookies.set(cookieNames.pendingRole, '', { path: '/', maxAge: 0 });
    return response;
  } catch (error) {
    return failure(error, request);
  }
}
