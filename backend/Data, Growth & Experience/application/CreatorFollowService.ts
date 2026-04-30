import { ApplicationError, requireValue } from '@/src/application/errors';
import type { Viewer } from '@/src/domain/models';
import type { CreatorFollowRepository, UserProfileRepository } from '@/src/domain/ports';

export class CreatorFollowService {
  constructor(
    private readonly creatorFollowRepository: CreatorFollowRepository,
    private readonly userProfileRepository: UserProfileRepository
  ) {}

  async getFollowState(viewer: Viewer | null, creatorUserId: string) {
    const creator = requireValue(
      await this.userProfileRepository.getPublicCreatorById(creatorUserId),
      'Creator not found.',
      404
    );

    const follow = await this.creatorFollowRepository.getFollowState({
      creatorUserId: creator.userId,
      viewerUserId: viewer?.user.id ?? null,
    });

    return {
      creator,
      follow,
    };
  }

  async followCreator(viewer: Viewer, creatorUserId: string) {
    const creator = requireValue(
      await this.userProfileRepository.getPublicCreatorById(creatorUserId),
      'Creator not found.',
      404
    );

    if (creator.userId === viewer.user.id) {
      throw new ApplicationError('You cannot follow your own creator profile.', 400);
    }

    await this.creatorFollowRepository.followCreator({
      creatorUserId: creator.userId,
      followerUserId: viewer.user.id,
    });

    return this.creatorFollowRepository.getFollowState({
      creatorUserId: creator.userId,
      viewerUserId: viewer.user.id,
    });
  }

  async unfollowCreator(viewer: Viewer, creatorUserId: string) {
    const creator = requireValue(
      await this.userProfileRepository.getPublicCreatorById(creatorUserId),
      'Creator not found.',
      404
    );

    await this.creatorFollowRepository.unfollowCreator({
      creatorUserId: creator.userId,
      followerUserId: viewer.user.id,
    });

    return this.creatorFollowRepository.getFollowState({
      creatorUserId: creator.userId,
      viewerUserId: viewer.user.id,
    });
  }
}


