import { createServerClient, type CookieOptions } from '@supabase/ssr';
import type { NextRequest } from 'next/server';
import { NextResponse } from 'next/server';

import { assertSupabaseEnv, env } from '@/lib/env';
import type { Database } from '@/types/database';

type AccessProfile = Pick<
  Database['public']['Tables']['user_profiles']['Row'],
  'primary_role' | 'is_admin' | 'is_banned'
>;

function routeNeedsViewer(pathname: string) {
  return (
    pathname.startsWith('/creator') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/dashboard/profile') ||
    pathname.startsWith('/dashboard/contact-admin') ||
    pathname.startsWith('/dashboard/transactions')
  );
}

function routeNeedsCreator(pathname: string) {
  return pathname.startsWith('/creator');
}

function routeNeedsAdmin(pathname: string) {
  return pathname.startsWith('/admin');
}

function routeSupportsBlockedRedirect(pathname: string) {
  return (
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/courses') ||
    pathname.startsWith('/creator') ||
    pathname.startsWith('/search') ||
    pathname.startsWith('/creators') ||
    pathname.startsWith('/admin')
  );
}

function redirectToLogin(request: NextRequest) {
  const loginUrl = new URL('/login', request.url);
  loginUrl.searchParams.set('next', request.nextUrl.pathname);
  return NextResponse.redirect(loginUrl);
}

async function loadAccessProfile(request: NextRequest): Promise<{
  response: NextResponse;
  profile: AccessProfile | null;
}> {
  assertSupabaseEnv();

  let response = NextResponse.next({
    request,
  });

  const supabase = createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        for (const cookie of cookiesToSet) {
          request.cookies.set(cookie.name, cookie.value);
        }

        response = NextResponse.next({
          request,
        });

        for (const cookie of cookiesToSet) {
          response.cookies.set(cookie.name, cookie.value, cookie.options);
        }
      },
    },
  });

  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  if (userError || !user) {
    return {
      response,
      profile: null,
    };
  }

  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('primary_role, is_admin, is_banned')
    .eq('user_id', user.id)
    .returns<AccessProfile>()
    .maybeSingle();

  if (profileError || !profile) {
    return {
      response,
      profile: null,
    };
  }

  return {
    response,
    profile,
  };
}

export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const needsViewer = routeNeedsViewer(pathname);

  try {
    const { response, profile } = await loadAccessProfile(request);

    if (!profile) {
      if (needsViewer) {
        return redirectToLogin(request);
      }

      return response;
    }

    if (profile.is_banned && routeSupportsBlockedRedirect(pathname)) {
      return NextResponse.redirect(new URL('/blocked', request.url));
    }

    if (routeNeedsCreator(pathname) && profile.primary_role !== 'creator') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (routeNeedsAdmin(pathname) && !profile.is_admin) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    return response;
  } catch {
    if (needsViewer) {
      return redirectToLogin(request);
    }

    return NextResponse.next();
  }
}

export const config = {
  matcher: ['/creator/:path*', '/admin/:path*', '/dashboard/:path*', '/courses/:path*', '/search', '/creators/:path*'],
};
