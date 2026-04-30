import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { signInSchema } from '@/src/presentation/schemas';
import { failure, safeNextPath } from '@/src/presentation/http/routeUtils';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = signInSchema.parse(body);
    const nextPath = safeNextPath(typeof body?.next === 'string' ? body.next : null);
    const { authService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.signIn(parsed);

    const response = NextResponse.json({ redirectTo: viewer.profile.isBanned ? '/blocked' : nextPath });
    applyViewerCookies(response, viewer);
    return response;
  } catch (error) {
    return failure(error);
  }
}


