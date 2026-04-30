import { slugify } from '@/lib/utils';
import { ApplicationError, requireValue } from '@/src/application/errors';
import { coursePremiumPlanIsValid, deriveCoursePremiumState } from '@/src/domain/coursePremium';
import {
  CREATOR_FREE_COURSE_LIMIT,
  PREMIUM_COURSE_FREE_NODE_LIMIT,
  courseCountsAsFree,
  courseCountsAsPremium,
  countFreeNodes,
  type CoursePricingPolicyInput,
} from '@/src/domain/creatorCoursePolicy';
import { deriveSafeNodeExcerpt } from '@/src/domain/nodeSearch';
import type { CourseCollaborationRepository, CourseRepository } from '@/src/domain/ports';
import type { CourseNode, CourseOverview, ModuleWithNodes, Viewer } from '@/src/domain/models';

export class CourseBuilderApplicationService {
  constructor(
    private readonly courseRepository: CourseRepository,
    private readonly collaborationRepository: CourseCollaborationRepository,
  ) {}

  async listCreatorCourses(viewer: Viewer) {
    this.assertCreator(viewer);
    const [ownedCourses, accessibleCourseIds] = await Promise.all([
      this.courseRepository.listCreatorCourses(viewer.user.id),
      this.collaborationRepository.listAccessibleCourseIds(viewer.user.id),
    ]);

    const ownedIds = new Set(ownedCourses.map((course) => course.id));
    const collaboratorIds = accessibleCourseIds.filter((courseId) => !ownedIds.has(courseId));
    const collaboratorCourses = collaboratorIds.length
      ? await this.courseRepository.listCourseOverviewsByIds(collaboratorIds)
      : [];

    return [
      ...ownedCourses.map((course) => ({ ...course, ownershipType: 'owner' as const })),
      ...collaboratorCourses.map((course) => ({ ...course, ownershipType: 'collaborator' as const, collaboratorRole: 'editor' as const })),
    ].sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime()) as CourseOverview[];
  }

  async getCreatorCourseDetail(viewer: Viewer, courseId: string) {
    this.assertCreator(viewer);
    const [course, access] = await Promise.all([
      this.courseRepository.getCourseDetailById(courseId),
      this.collaborationRepository.getCourseAccess({ courseId, userId: viewer.user.id }),
    ]);

    const resolvedCourse = requireValue(course, 'Course not found.');
    if (!access.canEditContent && !access.canManageCollaborators && !access.canManageSettings) {
      throw new ApplicationError('You cannot access another creator\'s course.', 403);
    }

    const ownershipType = resolvedCourse.creatorUserId === viewer.user.id ? 'owner' as const : 'collaborator' as const;
    return {
      ...resolvedCourse,
      ownershipType,
      collaboratorRole: ownershipType === 'collaborator' ? 'editor' as const : null,
    };
  }

  async getOwnedCreatorCourseDetail(viewer: Viewer, courseId: string) {
    this.assertCreator(viewer);
    const course = requireValue(await this.courseRepository.getCourseDetailById(courseId), 'Course not found.');
    this.assertCourseOwnership(viewer, course.creatorUserId);
    return {
      ...course,
      ownershipType: 'owner' as const,
      collaboratorRole: null,
    };
  }

  async getCreatorModuleDetail(viewer: Viewer, input: { courseId: string; moduleId: string }) {
    const course = await this.getCreatorCourseDetail(viewer, input.courseId);
    const module = requireValue(course.modules.find((entry) => entry.id === input.moduleId), 'Module not found.');

    return { course, module };
  }

  async getCreatorNodeDetail(viewer: Viewer, input: { courseId: string; moduleId: string; nodeId: string }) {
    const { course, module } = await this.getCreatorModuleDetail(viewer, input);
    const node = requireValue(module.nodes.find((entry) => entry.id === input.nodeId), 'Node not found.');

    return { course, module, node };
  }

  async createCourse(
    viewer: Viewer,
    input: {
      title: string;
      description: string;
      imageUrl: string | null;
      domainName?: string | null;
      priceAmount: number;
      premiumEnabled: boolean;
      premiumAccessDays: number | null;
      status: 'draft' | 'published';
    },
  ) {
    this.assertCreator(viewer);
    this.assertPremiumPlanInput(input);
    await this.assertCreatorFreeCourseLimit(viewer.user.id, input);

    return this.courseRepository.createCourse({
      creatorUserId: viewer.user.id,
      title: input.title,
      slug: slugify(input.title),
      description: input.description,
      imageUrl: input.imageUrl,
      domainName: input.domainName ?? null,
      priceAmount: input.premiumEnabled ? input.priceAmount : 0,
      premiumEnabled: input.premiumEnabled,
      premiumAccessDays: input.premiumEnabled ? input.premiumAccessDays : null,
      status: input.status,
    });
  }

  async updateCourse(
    viewer: Viewer,
    input: {
      courseId: string;
      title: string;
      description: string;
      imageUrl: string | null;
      domainName?: string | null;
      priceAmount: number;
      premiumEnabled: boolean;
      premiumAccessDays: number | null;
      status: 'draft' | 'published';
    },
  ) {
    this.assertCreator(viewer);
    const course = requireValue(await this.courseRepository.getCourseById(input.courseId), 'Course not found.');
    this.assertCourseOwnership(viewer, course.creatorUserId);
    this.assertPremiumPlanInput(input);

    const courseDetail = requireValue(await this.courseRepository.getCourseDetailById(input.courseId), 'Course not found.');
    await this.assertCreatorFreeCourseLimit(viewer.user.id, input, input.courseId);
    this.assertPremiumCourseFreeNodeLimitForCourse(courseDetail, input);

    const premiumNodeCount = courseDetail.modules.reduce(
      (sum, module) => sum + module.nodes.filter((node) => node.isPremium).length,
      0,
    );
    const premiumState = deriveCoursePremiumState(
      {
        premiumEnabled: input.premiumEnabled,
        priceAmount: input.premiumEnabled ? input.priceAmount : 0,
        premiumAccessDays: input.premiumEnabled ? input.premiumAccessDays : null,
      },
      premiumNodeCount,
    );

    if (input.status === 'published' && premiumState === 'pricing_incomplete') {
      throw new ApplicationError(
        'Published courses cannot keep premium nodes unless the premium price and duration are fully configured.',
      );
    }

    return this.courseRepository.updateCourse({
      courseId: input.courseId,
      creatorUserId: viewer.user.id,
      title: input.title,
      slug: slugify(input.title),
      description: input.description,
      imageUrl: input.imageUrl,
      domainName: input.domainName ?? null,
      priceAmount: input.premiumEnabled ? input.priceAmount : 0,
      premiumEnabled: input.premiumEnabled,
      premiumAccessDays: input.premiumEnabled ? input.premiumAccessDays : null,
      status: input.status,
    });
  }

  async createModule(viewer: Viewer, input: { courseId: string; title: string; summary: string }) {
    const course = await this.getCreatorCourseDetail(viewer, input.courseId);
    return this.courseRepository.createModule({ courseId: course.id, title: input.title, summary: input.summary });
  }

  async updateModule(viewer: Viewer, input: { moduleId: string; courseId: string; title: string; summary: string }) {
    await this.getCreatorModuleDetail(viewer, input);
    await this.courseRepository.updateModule({ moduleId: input.moduleId, title: input.title, summary: input.summary });
  }

  async deleteModule(viewer: Viewer, input: { moduleId: string; courseId: string }) {
    await this.getCreatorModuleDetail(viewer, { courseId: input.courseId, moduleId: input.moduleId });
    await this.courseRepository.deleteModule({ courseId: input.courseId, moduleId: input.moduleId });
  }

  async reorderModules(viewer: Viewer, input: { courseId: string; moduleIdsInOrder: string[] }) {
    await this.getCreatorCourseDetail(viewer, input.courseId);
    await this.courseRepository.reorderModules(input);
  }

  async createNode(
    viewer: Viewer,
    input: {
      courseId: string;
      moduleId: string;
      type: CourseNode['type'];
      title: string;
      payload: CourseNode['payload'];
      isPremium: boolean;
      excerpt: string | null;
    },
  ) {
    const { module, course } = await this.getCreatorModuleDetail(viewer, { courseId: input.courseId, moduleId: input.moduleId });
    if (input.isPremium && course.status === 'published' && !coursePremiumPlanIsValid(course)) {
      throw new ApplicationError('Published courses need a valid premium plan before premium nodes can be saved.');
    }
    this.assertPremiumCourseFreeNodeLimitForNode(course, { targetNodeIsPremium: input.isPremium });

    return this.courseRepository.createNode({
      moduleId: module.id,
      type: input.type,
      title: input.title,
      payload: input.payload,
      isPremium: input.isPremium,
      excerpt:
        deriveSafeNodeExcerpt({
          type: input.type,
          payload: input.payload,
          excerpt: input.excerpt,
        }) || null,
    });
  }

  async updateNode(
    viewer: Viewer,
    input: {
      courseId: string;
      moduleId: string;
      nodeId: string;
      title: string;
      payload: CourseNode['payload'];
      isPremium: boolean;
      excerpt: string | null;
    },
  ) {
    const { course } = await this.getCreatorNodeDetail(viewer, input);
    if (input.isPremium && course.status === 'published' && !coursePremiumPlanIsValid(course)) {
      throw new ApplicationError('Published courses need a valid premium plan before premium nodes can be saved.');
    }
    this.assertPremiumCourseFreeNodeLimitForNode(course, {
      targetNodeIsPremium: input.isPremium,
      excludeNodeId: input.nodeId,
    });

    await this.courseRepository.updateNode({
      nodeId: input.nodeId,
      title: input.title,
      payload: input.payload,
      isPremium: input.isPremium,
      excerpt:
        deriveSafeNodeExcerpt({
          type:
            course.modules
              .flatMap((module) => module.nodes)
              .find((entry) => entry.id === input.nodeId)?.type ?? 'content',
          payload: input.payload,
          excerpt: input.excerpt,
        }) || null,
    });
  }

  async deleteNode(viewer: Viewer, input: { courseId: string; moduleId: string; nodeId: string }) {
    await this.getCreatorNodeDetail(viewer, input);
    await this.courseRepository.deleteNode({ moduleId: input.moduleId, nodeId: input.nodeId });
  }

  async reorderNodes(viewer: Viewer, input: { courseId: string; moduleId: string; nodeIdsInOrder: string[] }) {
    const { module } = await this.getCreatorModuleDetail(viewer, { courseId: input.courseId, moduleId: input.moduleId });
    await this.courseRepository.reorderNodes({ moduleId: module.id, nodeIdsInOrder: input.nodeIdsInOrder });
  }

  private assertCreator(viewer: Viewer) {
    if (viewer.profile.primaryRole !== 'creator') {
      throw new ApplicationError('Creator access is required.', 403);
    }
  }

  private assertCourseOwnership(viewer: Viewer, creatorUserId: string) {
    if (creatorUserId !== viewer.user.id) {
      throw new ApplicationError('You cannot access another creator\'s course.', 403);
    }
  }

  private assertPremiumPlanInput(input: { premiumEnabled: boolean; priceAmount: number; premiumAccessDays: number | null }) {
    if (!input.premiumEnabled) {
      return;
    }
    if (input.priceAmount <= 0) {
      throw new ApplicationError('Premium pricing requires a price greater than zero.');
    }
    if (!input.premiumAccessDays || input.premiumAccessDays <= 0) {
      throw new ApplicationError('Premium pricing requires an access duration in days.');
    }
  }

  private async assertCreatorFreeCourseLimit(
    creatorUserId: string,
    candidate: CoursePricingPolicyInput,
    excludingCourseId?: string
  ) {
    if (!courseCountsAsFree(candidate)) {
      return;
    }

    const creatorCourses = await this.courseRepository.listCreatorCourses(creatorUserId);
    const freeCourseCount = creatorCourses.filter(
      (course) => course.id !== excludingCourseId && courseCountsAsFree(course)
    ).length;

    if (freeCourseCount >= CREATOR_FREE_COURSE_LIMIT) {
      throw new ApplicationError(
        `Creator free course limit reached. A creator can keep at most ${CREATOR_FREE_COURSE_LIMIT} free courses. Enable premium pricing for this course, or convert an existing free course to premium before saving another free course.`
      );
    }
  }

  private assertPremiumCourseFreeNodeLimitForCourse(
    course: CoursePricingPolicyInput & { modules: ModuleWithNodes[] },
    candidate: CoursePricingPolicyInput
  ) {
    if (!courseCountsAsPremium(candidate)) {
      return;
    }

    const freeNodeCount = countFreeNodes(course.modules);
    if (freeNodeCount > PREMIUM_COURSE_FREE_NODE_LIMIT) {
      throw new ApplicationError(
        `Premium courses can expose at most ${PREMIUM_COURSE_FREE_NODE_LIMIT} free nodes. This course currently has ${freeNodeCount}; mark extra nodes as premium before saving this premium plan.`
      );
    }
  }

  private assertPremiumCourseFreeNodeLimitForNode(
    course: CoursePricingPolicyInput & { modules: ModuleWithNodes[] },
    input: { targetNodeIsPremium: boolean; excludeNodeId?: string }
  ) {
    if (!courseCountsAsPremium(course) || input.targetNodeIsPremium) {
      return;
    }

    const projectedFreeNodeCount = countFreeNodes(course.modules, input.excludeNodeId) + 1;
    if (projectedFreeNodeCount > PREMIUM_COURSE_FREE_NODE_LIMIT) {
      throw new ApplicationError(
        `Premium courses can expose at most ${PREMIUM_COURSE_FREE_NODE_LIMIT} free nodes. Mark this node as premium, or convert an existing free node to premium first.`
      );
    }
  }
}
