import { NextResponse } from 'next/server';

import { cookieNames } from '@/lib/constants';
import { env } from '@/lib/env';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { failure, safeNextPath } from '@/src/presentation/http/routeUtils';

export async function GET(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const url = new URL(request.url);
    const nextPath = safeNextPath(url.searchParams.get('next'));
    const role = url.searchParams.get('role') === 'creator' ? 'creator' : 'learner';
    const callbackUrl = new URL('/auth/callback', env.appUrl);
    callbackUrl.searchParams.set('next', nextPath);
    const { authService } = await createServerContainer({ writeCookies: true });
    const oauthUrl = await authService.beginGoogleOAuth(callbackUrl.toString());
    const response = NextResponse.redirect(oauthUrl);
    response.cookies.set(cookieNames.pendingRole, role, {
      path: '/',
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
    });
    return response;
  } catch (error) {
    return failure(error, request);
  }
}
