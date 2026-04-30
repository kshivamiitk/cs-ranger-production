import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { signUpSchema } from '@/src/presentation/schemas';
import { failure, safeNextPath } from '@/src/presentation/http/routeUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signUpSchema.parse(body);
    const nextPath = safeNextPath(typeof body?.next === 'string' ? body.next : null);
    const { authService } = await createServerContainer({ writeCookies: true });
    const result = await authService.signUp({
      ...parsed,
      redirectTo: `${new URL(request.url).origin}/auth/callback?next=${encodeURIComponent(nextPath)}`,
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
    return failure(error);
  }
}


