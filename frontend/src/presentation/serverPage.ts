import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { cache } from 'react';

import { cookieNames, defaultTheme } from '@/lib/constants';
import type { ThemeMode } from '@/src/domain/models';
import { createServerContainer } from '@/src/infrastructure/container/server';

const getReadonlyServerContainer = cache(async () => createServerContainer());

function themeFromCookie(value: string | undefined): ThemeMode | null {
  if (value === 'light' || value === 'dark' || value === 'ocean' || value === 'forest' || value === 'ember') {
    return value;
  }

  return null;
}

export async function getServerViewerContext() {
  const { viewer, themeMode } = await getServerPageContext();

  return { viewer, themeMode };
}

export async function getServerPageContext() {
  const cookieStore = await cookies();
  const cookieThemeMode = themeFromCookie(cookieStore.get(cookieNames.theme)?.value);
  const container = await getReadonlyServerContainer();
  const viewerContext = await container.authService.getViewerContext(cookieThemeMode ?? defaultTheme);

  return {
    ...viewerContext,
    themeMode: cookieThemeMode ?? viewerContext.themeMode,
    container,
  };
}

export async function requireServerViewer(nextPath: string) {
  const { container: _container, ...context } = await requireServerPageContext(nextPath);

  return context;
}

export async function requireServerPageContext(nextPath: string) {
  const context = await getServerPageContext();
  if (!context.viewer) {
    redirect(`/login?next=${encodeURIComponent(nextPath)}`);
  }

  if (context.viewer.profile.isBanned) {
    redirect('/blocked');
  }

  return {
    ...context,
    viewer: context.viewer,
  };
}

export async function requireServerCreator(nextPath: string) {
  const { container: _container, ...context } = await requireServerCreatorPageContext(nextPath);

  return context;
}

export async function requireServerCreatorPageContext(nextPath: string) {
  const context = await requireServerPageContext(nextPath);
  if (!context.viewer || context.viewer.profile.primaryRole !== 'creator') {
    redirect('/dashboard');
  }

  return {
    ...context,
    viewer: context.viewer,
  };
}

export async function requireServerAdmin(nextPath: string) {
  const context = await requireServerViewer(nextPath);
  if (!context.viewer || !context.viewer.profile.isAdmin) {
    redirect('/dashboard');
  }

  return {
    ...context,
    viewer: context.viewer,
  };
}
