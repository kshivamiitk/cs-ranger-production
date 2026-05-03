import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

import { clearViewerCookies } from '@/lib/appCookies';
import { createServerContainer } from '@/src/infrastructure/container/server';

function createSignOutRedirectResponse() {
  return new NextResponse(null, {
    status: 303,
    headers: {
      Location: '/login',
      'Cache-Control': 'no-store',
    },
  });
}

export async function POST() {
  const { authService } = await createServerContainer({ writeCookies: true });
  await authService.signOut();

  const response = createSignOutRedirectResponse();
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
