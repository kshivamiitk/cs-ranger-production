import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { env } from '@/lib/env';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { signUpSchema } from '@/src/presentation/schemas';
import { failure, readJsonWithLimit, safeNextPath } from '@/src/presentation/http/routeUtils';

const AUTH_BODY_LIMIT_BYTES = 16 * 1024;

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const body = await readJsonWithLimit(request, AUTH_BODY_LIMIT_BYTES);
    const parsed = signUpSchema.parse(body);
    const nextPath = safeNextPath(typeof (body as { next?: unknown })?.next === 'string' ? (body as { next: string }).next : null);
    const callbackUrl = new URL('/auth/callback', env.appUrl);
    callbackUrl.searchParams.set('next', nextPath);
    const { authService } = await createServerContainer({ writeCookies: true });
    const result = await authService.signUp({
      ...parsed,
      redirectTo: callbackUrl.toString(),
    });

    if (!result.viewer) {
      return NextResponse.json({
        message: 'Account created. Confirm your email, then sign in.',
      });
    }

    const response = NextResponse.json({ redirectTo: nextPath });
    applyViewerCookies(response, result.viewer);
    return response;
  } catch (error) {
    return failure(error, request);
  }
}
