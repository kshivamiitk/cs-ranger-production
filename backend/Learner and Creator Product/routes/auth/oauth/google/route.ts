import { NextResponse } from 'next/server';

import { cookieNames } from '@/lib/constants';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { safeNextPath } from '@/src/presentation/http/routeUtils';

export async function GET(request: Request) {
  const url = new URL(request.url);
  const nextPath = safeNextPath(url.searchParams.get('next'));
  const role = url.searchParams.get('role') === 'creator' ? 'creator' : 'learner';
  const callbackUrl = `${url.origin}/auth/callback?next=${encodeURIComponent(nextPath)}`;
  const { authService } = await createServerContainer({ writeCookies: true });
  const oauthUrl = await authService.beginGoogleOAuth(callbackUrl);
  const response = NextResponse.redirect(oauthUrl);
  response.cookies.set(cookieNames.pendingRole, role, {
    path: '/',
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}


