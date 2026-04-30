import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { cookieNames } from '@/lib/constants';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { safeNextPath } from '@/src/presentation/http/routeUtils';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const nextPath = safeNextPath(url.searchParams.get('next'));
  const recovery = url.searchParams.get('recovery') === '1';

  if (!code) {
    return NextResponse.redirect(new URL(`/login?next=${encodeURIComponent(nextPath)}`, request.url));
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

  const response = NextResponse.redirect(new URL(destination, request.url));
  applyViewerCookies(response, viewer);
  response.cookies.set(cookieNames.pendingRole, '', { path: '/', maxAge: 0 });
  return response;
}


