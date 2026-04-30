import { requireValue } from '@/src/application/errors';
import type { ThemeMode, Viewer } from '@/src/domain/models';
import type { UserProfileRepository } from '@/src/domain/ports';

export class UserProfileService {
  constructor(private readonly userProfileRepository: UserProfileRepository) {}

  async getOwnProfile(viewer: Viewer) {
    return requireValue(
      await this.userProfileRepository.getByUserId(viewer.user.id),
      'Profile not found.',
      404
    );
  }

  async updateOwnProfile(
    viewer: Viewer,
    input: {
      fullName: string | null;
      username: string | null;
      profilePhotoUrl: string | null;
      bio: string | null;
      themeMode: ThemeMode;
      githubUsername?: string | null;
      githubProfileUrl?: string | null;
    }
  ) {
    return this.userProfileRepository.updateOwnProfile({
      userId: viewer.user.id,
      fullName: input.fullName,
      username: input.username,
      profilePhotoUrl: input.profilePhotoUrl,
      bio: input.bio,
      themeMode: input.themeMode,
      githubUsername: input.githubUsername ?? null,
      githubProfileUrl: input.githubProfileUrl ?? null,
    });
  }
}


