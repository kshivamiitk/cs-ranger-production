import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearViewerCookies } from '@/lib/appCookies';
import { env } from '@/lib/env';
import { createServerContainer } from '@/src/infrastructure/container/server';

function isLocalHostName(hostname: string) {
  return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '0.0.0.0';
}

function resolveSignOutLocation(request: Request) {
  try {
    const requestUrl = new URL(request.url);
    const origin =
      process.env.NODE_ENV === 'production' && isLocalHostName(requestUrl.hostname)
        ? env.appUrl
        : requestUrl.origin;
    return new URL('/login', origin).toString();
  } catch {
    return '/login';
  }
}

function createSignOutRedirectResponse(request: Request) {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: resolveSignOutLocation(request),
      'Cache-Control': 'no-store',
    },
  });
}

async function handleSignOut(request: Request) {
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

export async function GET(request: Request) {
  return handleSignOut(request);
}

export async function POST(request: Request) {
  return handleSignOut(request);
}
