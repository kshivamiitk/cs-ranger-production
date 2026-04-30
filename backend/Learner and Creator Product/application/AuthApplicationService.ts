import type { AuthGateway, UserProfileRepository } from '@/src/domain/ports';
import type { ThemeMode, UserRole, Viewer, ViewerContext } from '@/src/domain/models';
import { ApplicationError, requireValue } from '@/src/application/errors';

export class AuthApplicationService {
  constructor(
    private readonly authGateway: AuthGateway,
    private readonly userProfileRepository: UserProfileRepository
  ) {}

  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
    username?: string | null;
    primaryRole: UserRole;
    redirectTo: string;
  }) {
    const authResult = await this.authGateway.signUp(input);

    if (!authResult.user) {
      return {
        viewer: null,
        needsEmailConfirmation: authResult.needsEmailConfirmation,
      };
    }

    const profile = await this.userProfileRepository.upsert({
      userId: authResult.user.id,
      fullName: input.fullName,
      username: input.username ?? null,
      primaryRole: input.primaryRole,
    });

    return {
      viewer: {
        user: authResult.user,
        profile,
      } satisfies Viewer,
      needsEmailConfirmation: false,
    };
  }

  async signIn(input: { email: string; password: string }) {
    const user = await this.authGateway.signIn(input);
    const existingProfile = await this.userProfileRepository.getByUserId(user.id);
    const profile = existingProfile
      ? existingProfile
      : await this.userProfileRepository.upsert({
          userId: user.id,
          fullName: user.fullName,
          primaryRole: 'learner',
        });

    return {
      user,
      profile,
    } satisfies Viewer;
  }

  async signOut() {
    await this.authGateway.signOut();
  }

  async requestPasswordReset(input: { email: string; redirectTo: string }) {
    await this.authGateway.requestPasswordReset(input);
  }

  async updatePassword(viewer: Viewer, password: string) {
    this.ensureViewerAllowed(viewer.profile.isBanned);
    await this.authGateway.updatePassword({ password });
  }

  async completePasswordRecoverySession(code: string) {
    const user = await this.authGateway.exchangeCodeForSession({ code });
    if (!user) {
      throw new ApplicationError('Recovery session could not be created.', 400);
    }

    const existingProfile = await this.userProfileRepository.getByUserId(user.id);
    const profile = existingProfile
      ? existingProfile
      : await this.userProfileRepository.upsert({
          userId: user.id,
          fullName: user.fullName,
          primaryRole: 'learner',
        });

    return {
      user,
      profile,
    } satisfies Viewer;
  }

  async beginGoogleOAuth(redirectTo: string) {
    return this.authGateway.beginGoogleOAuth({ redirectTo });
  }

  async completeGoogleOAuth(code: string, fallbackRole: UserRole = 'learner') {
    const user = await this.authGateway.exchangeCodeForSession({ code });
    if (!user) {
      throw new ApplicationError('OAuth session could not be created.', 400);
    }

    const existingProfile = await this.userProfileRepository.getByUserId(user.id);
    const profile = existingProfile
      ? existingProfile
      : await this.userProfileRepository.upsert({
          userId: user.id,
          fullName: user.fullName,
          primaryRole: fallbackRole,
        });

    return {
      user,
      profile,
    } satisfies Viewer;
  }

  async getViewerContext(themeMode: ThemeMode): Promise<ViewerContext> {
    const user = await this.authGateway.getCurrentUser();
    if (!user) {
      return {
        viewer: null,
        themeMode,
      };
    }

    const profile = requireValue(
      await this.userProfileRepository.getByUserId(user.id),
      'User profile was not found.',
      401
    );

    return {
      viewer: {
        user,
        profile,
      },
      themeMode: profile.themeMode ?? themeMode,
    };
  }

  async requireViewer() {
    const user = await this.authGateway.getCurrentUser();
    if (!user) {
      throw new ApplicationError('You must be logged in.', 401);
    }

    const profile = requireValue(
      await this.userProfileRepository.getByUserId(user.id),
      'User profile was not found.',
      401
    );

    this.ensureViewerAllowed(profile.isBanned);

    return {
      user,
      profile,
    } satisfies Viewer;
  }

  async requireCreator() {
    const viewer = await this.requireViewer();
    if (viewer.profile.primaryRole !== 'creator') {
      throw new ApplicationError('Creator access is required.', 403);
    }

    return viewer;
  }

  async requireAdmin() {
    const viewer = await this.requireViewer();
    if (!viewer.profile.isAdmin) {
      throw new ApplicationError('Admin access is required.', 403);
    }

    return viewer;
  }

  async updateThemeMode(userId: string, themeMode: ThemeMode) {
    await this.userProfileRepository.updateThemeMode(userId, themeMode);
  }

  private ensureViewerAllowed(isBanned: boolean) {
    if (isBanned) {
      throw new ApplicationError('This account has been blocked from normal product use.', 403);
    }
  }
}


