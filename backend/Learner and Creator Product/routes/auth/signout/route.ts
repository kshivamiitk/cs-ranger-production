import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearViewerCookies } from '@/lib/appCookies';
import { env } from '@/lib/env';
import { createServerContainer } from '@/src/infrastructure/container/server';

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() ?? '';
}

function isLocalOrigin(origin: string) {
  try {
    const host = new URL(origin).hostname;
    return host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0';
  } catch {
    return false;
  }
}

function resolveSignOutRedirectUrl(request: Request) {
  const requestUrl = new URL(request.url);
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host')) || firstHeaderValue(request.headers.get('host'));
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto')) || requestUrl.protocol.replace(':', '');
  const forwardedOrigin = forwardedHost ? `${forwardedProto}://${forwardedHost}` : requestUrl.origin;

  let configuredOrigin = '';
  try {
    configuredOrigin = env.appUrl ? new URL(env.appUrl).origin : '';
  } catch {
    configuredOrigin = '';
  }

  const origin = !isLocalOrigin(forwardedOrigin)
    ? forwardedOrigin
    : configuredOrigin && !isLocalOrigin(configuredOrigin)
      ? configuredOrigin
      : requestUrl.origin;

  return new URL('/login', origin);
}

export async function POST(request: Request) {
  const { authService } = await createServerContainer({ writeCookies: true });
  await authService.signOut();

  const response = NextResponse.redirect(resolveSignOutRedirectUrl(request), { status: 303 });
  clearViewerCookies(response);
  const cookieStore = await cookies();
  for (const cookie of cookieStore.getAll()) {
    if (cookie.name.startsWith('sb-')) {
      response.cookies.set(cookie.name, '', {
        path: '/',
        maxAge: 0,
        sameSite: 'lax',
        secure: process.env.NODE_ENV === 'production',
      });
    }
  }
  return response;
}

