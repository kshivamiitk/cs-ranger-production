import { NextResponse } from 'next/server';

import { applyViewerCookies } from '@/lib/appCookies';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { defaultTheme } from '@/lib/constants';
import { failure } from '@/src/presentation/http/routeUtils';
import { profileUpdateSchema } from '@/src/presentation/schemas';

function toViewerPayload(viewer: {
  user: { id: string; email: string };
  profile: {
    fullName: string | null;
    username?: string | null;
    primaryRole: 'learner' | 'creator';
    themeMode: 'light' | 'dark' | 'ocean' | 'forest' | 'ember';
    profilePhotoUrl: string | null;
    bio: string | null;
    githubUsername?: string | null;
    githubProfileUrl?: string | null;
    isAdmin: boolean;
    isBanned: boolean;
  };
}) {
  return {
    id: viewer.user.id,
    email: viewer.user.email,
    fullName: viewer.profile.fullName,
    username: viewer.profile.username ?? null,
    primaryRole: viewer.profile.primaryRole,
    themeMode: viewer.profile.themeMode,
    profilePhotoUrl: viewer.profile.profilePhotoUrl,
    bio: viewer.profile.bio,
    githubUsername: viewer.profile.githubUsername ?? null,
    githubProfileUrl: viewer.profile.githubProfileUrl ?? null,
    isAdmin: viewer.profile.isAdmin,
    isBanned: viewer.profile.isBanned,
  };
}

export async function GET() {
  const { authService } = await createServerContainer({ writeCookies: true });
  const context = await authService.getViewerContext(defaultTheme);

  return NextResponse.json({
    viewer: context.viewer ? toViewerPayload(context.viewer) : null,
  });
}

export async function PATCH(request: Request) {
  try {
    const parsed = profileUpdateSchema.parse(await request.json());
    const { authService, userProfileService } = await createServerContainer({ writeCookies: true });
    const viewer = await authService.requireViewer();
    const profile = await userProfileService.updateOwnProfile(viewer, parsed);

    const updatedViewer = {
      user: viewer.user,
      profile,
    };

    const response = NextResponse.json({ viewer: toViewerPayload(updatedViewer) });
    applyViewerCookies(response, updatedViewer);
    return response;
  } catch (error) {
    return failure(error);
  }
}


