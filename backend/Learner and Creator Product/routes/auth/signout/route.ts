import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { env } from '@/lib/env';
import { clearViewerCookies } from '@/lib/appCookies';
import { createServerContainer } from '@/src/infrastructure/container/server';

function firstHeaderValue(value: string | null) {
  return value?.split(',')[0]?.trim() ?? '';
}

function isLocalHost(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function safeRequestOrigin(request: Request) {
  const forwardedHost = firstHeaderValue(request.headers.get('x-forwarded-host'));
  const host = forwardedHost || firstHeaderValue(request.headers.get('host'));
  const forwardedProto = firstHeaderValue(request.headers.get('x-forwarded-proto'));

  try {
    const requestUrl = new URL(request.url);
    const proto = forwardedProto || requestUrl.protocol.replace(':', '');

    if (host && /^[a-z0-9.-]+(?::\d+)?$/i.test(host) && (proto === 'http' || proto === 'https')) {
      const origin = new URL(`${proto}://${host}`).origin;
      const hostname = new URL(origin).hostname;
      if (process.env.NODE_ENV === 'production' && isLocalHost(hostname)) {
        return env.appUrl;
      }

      return origin;
    }

    if (process.env.NODE_ENV === 'production' && isLocalHost(requestUrl.hostname)) {
      return env.appUrl;
    }
  } catch {
    // Fall through to the configured app URL.
  }

  return env.appUrl;
}

function createSignOutRedirectResponse(request: Request) {
  const location = new URL('/login', safeRequestOrigin(request)).toString();

  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: location,
      'Cache-Control': 'no-store',
    },
  });
}

async function signOut(request: Request) {
  const { authService } = await createServerContainer({ writeCookies: true });
  await authService.signOut();

  const response = createSignOutRedirectResponse(request);
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

export async function POST(request: Request) {
  return signOut(request);
}

export async function GET(request: Request) {
  return signOut(request);
}
