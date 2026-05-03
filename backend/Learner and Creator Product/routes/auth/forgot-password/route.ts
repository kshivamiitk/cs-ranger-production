import { NextResponse } from 'next/server';
import { ZodError } from 'zod';

import { env } from '@/lib/env';
import { enforceRateLimit } from '@/src/platform/rate-limiting/redisRateLimiter';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { forgotPasswordSchema } from '@/src/presentation/schemas';
import { failure, readJsonWithLimit, safeNextPath } from '@/src/presentation/http/routeUtils';

const genericMessage =
  'If an account exists for this email, you will receive a password reset link shortly. Check your inbox and spam folder.';
const AUTH_BODY_LIMIT_BYTES = 8 * 1024;

export async function POST(request: Request) {
  try {
    const rateLimited = await enforceRateLimit(request, 'auth');
    if (rateLimited) return rateLimited;

    const body = await readJsonWithLimit(request, AUTH_BODY_LIMIT_BYTES);
    const parsed = forgotPasswordSchema.parse(body);
    const nextPath = safeNextPath(typeof (body as { next?: unknown })?.next === 'string' ? (body as { next: string }).next : null);
    const callbackUrl = new URL('/auth/callback', env.appUrl);
    callbackUrl.searchParams.set('recovery', '1');
    callbackUrl.searchParams.set('next', nextPath);

    const { authService } = await createServerContainer();
    await authService.requestPasswordReset({
      email: parsed.email,
      redirectTo: callbackUrl.toString(),
    });

    return NextResponse.json({ message: genericMessage });
  } catch (error) {
    if (error instanceof ZodError) {
      return failure(error, request);
    }
    return NextResponse.json({ message: genericMessage });
  }
}
