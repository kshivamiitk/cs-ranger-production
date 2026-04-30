import { requireValue } from '@/src/application/errors';
import { CatalogCourseSummaryQueryService } from '@/src/application/CatalogCourseSummaryQueryService';
import type { UserProfile, Viewer } from '@/src/domain/models';
import type { CourseRepository, CreatorFollowRepository, UserProfileRepository } from '@/src/domain/ports';

export class CreatorPublicProfileService {
  constructor(
    private readonly userProfileRepository: UserProfileRepository,
    private readonly creatorFollowRepository: CreatorFollowRepository,
    private readonly courseRepository: CourseRepository,
    private readonly catalogCourseSummaryQueryService: CatalogCourseSummaryQueryService
  ) {}

  async getCreatorPublicProfile(viewer: Viewer | null, creatorHandle: string) {
    const creator = requireValue(
      await this.userProfileRepository.getPublicCreatorByHandle(creatorHandle),
      'Creator not found.',
      404
    );

    const courses = await this.courseRepository.listPublishedCoursesByCreator(creator.userId);
    const catalogCourses = await this.catalogCourseSummaryQueryService.buildSummaries(viewer, courses);

    const follow = await this.creatorFollowRepository.getFollowState({
      creatorUserId: creator.userId,
      viewerUserId: viewer?.user.id ?? null,
    });

    return {
      creator: this.toPublicCreatorSummary(creator),
      follow,
      courses: catalogCourses,
    };
  }

  async getCreatorProfileSummary(viewer: Viewer | null, creatorHandle: string) {
    const creator = requireValue(
      await this.userProfileRepository.getPublicCreatorByHandle(creatorHandle),
      'Creator not found.',
      404
    );

    const follow = await this.creatorFollowRepository.getFollowState({
      creatorUserId: creator.userId,
      viewerUserId: viewer?.user.id ?? null,
    });

    return {
      creator: this.toPublicCreatorSummary(creator),
      follow,
    };
  }

  private toPublicCreatorSummary(creator: UserProfile) {
    return {
      userId: creator.userId,
      fullName: creator.fullName,
      username: creator.username ?? null,
      primaryRole: creator.primaryRole,
      profilePhotoUrl: creator.profilePhotoUrl,
      bio: creator.bio,
      isBanned: creator.isBanned,
    };
  }
}

