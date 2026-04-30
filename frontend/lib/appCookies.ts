import type { NextResponse } from 'next/server';

import { cookieNames, defaultTheme } from '@/lib/constants';
import type { ThemeMode, Viewer } from '@/src/domain/models';

const cookieOptions = {
  httpOnly: false,
  sameSite: 'lax' as const,
  secure: process.env.NODE_ENV === 'production',
  path: '/',
};

export function applyViewerCookies(response: NextResponse, viewer: Viewer) {
  response.cookies.set(cookieNames.theme, viewer.profile.themeMode ?? defaultTheme, cookieOptions);
}

export function applyGuestThemeCookie(response: NextResponse, themeMode: ThemeMode) {
  response.cookies.set(cookieNames.theme, themeMode, cookieOptions);
}

export function clearViewerCookies(response: NextResponse) {
  response.cookies.set(cookieNames.pendingRole, '', { ...cookieOptions, maxAge: 0 });
  response.cookies.set('app_is_admin', '', { ...cookieOptions, maxAge: 0 });
}


