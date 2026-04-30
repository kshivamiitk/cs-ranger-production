import { CatalogApplicationService } from '@/src/application/CatalogApplicationService';
import { LearnerFinanceApplicationService } from '@/src/application/LearnerFinanceApplicationService';
import { NodeBookmarkQueryService } from '@/src/application/NodeBookmarkQueryService';
import { WishlistQueryService } from '@/src/application/WishlistQueryService';
import type {
  BookmarkedNodeView,
  CatalogCourseSummary,
  LearnerAccessCenterView,
  LearnerFeedEvent,
  LearningStreakSummary,
  MilestoneBadge,
  Viewer,
  WishlistedCourseView,
} from '@/src/domain/models';
import type {
  CourseRepository,
  CreatorFollowRepository,
  LearnerProgressRepository,
} from '@/src/domain/ports';

const dayMs = 24 * 60 * 60 * 1000;

export interface LearnerDashboardViewModel {
  stats: {
    publishedCourses: number;
    continueLearningCourses: number;
    activePremiumCourses: number;
    pendingPayments: number;
    savedNodes: number;
    savedCourses: number;
    followedCreators: number;
  };
  continueLearningCourses: CatalogCourseSummary[];
  expiringCourses: CatalogCourseSummary[];
  pendingTransactions: Awaited<ReturnType<LearnerFinanceApplicationService['getLearnerTransactions']>>['items'];
  savedNodes: BookmarkedNodeView[];
  savedCourses: WishlistedCourseView[];
  catalogCourses: CatalogCourseSummary[];
  feed: {
    followedCreatorCount: number;
    items: LearnerFeedEvent[];
  };
  accessCenter: LearnerAccessCenterView;
  streak: LearningStreakSummary;
  badges: MilestoneBadge[];
}

export class LearnerDashboardApplicationService {
  constructor(
    private readonly catalogService: CatalogApplicationService,
    private readonly learnerFinanceService: LearnerFinanceApplicationService,
    private readonly nodeBookmarkQueryService: NodeBookmarkQueryService,
    private readonly wishlistQueryService: WishlistQueryService,
    private readonly courseRepository: CourseRepository,
    private readonly creatorFollowRepository: CreatorFollowRepository,
    private readonly learnerProgressRepository: LearnerProgressRepository
  ) {}

  async getDashboard(
    viewer: Viewer,
    options: { includeFeed?: boolean } = {}
  ): Promise<LearnerDashboardViewModel> {
    const [catalogCourses, transactions, savedNodes, followedCreatorIds] = await Promise.all([
      this.catalogService.listPublishedCourses(viewer),
      this.learnerFinanceService.getLearnerTransactions(viewer),
      this.nodeBookmarkQueryService.getBookmarkedNodesView(viewer),
      this.creatorFollowRepository.listFollowedCreatorIds(viewer.user.id),
    ]);
    const savedCourses = await this.wishlistQueryService.getLearnerWishlist(viewer, catalogCourses);
    const progressRows = await this.learnerProgressRepository.listNodeProgressByCourses({
      learnerUserId: viewer.user.id,
      courseIds: catalogCourses.map((course) => course.id),
    });

    const continueLearningCourses = [...catalogCourses]
      .filter((course) => course.progress?.continueLearning)
      .sort((left, right) => {
        const leftVisited = left.progress?.lastVisited?.visitedAt ?? left.updatedAt;
        const rightVisited = right.progress?.lastVisited?.visitedAt ?? right.updatedAt;
        return new Date(rightVisited).getTime() - new Date(leftVisited).getTime();
      })
      .slice(0, 4);

    const expiringCourses = [...catalogCourses]
      .filter((course) => Boolean(course.access.activeEntitlement?.expiresAt))
      .sort((left, right) => {
        const leftMs = new Date(left.access.activeEntitlement?.expiresAt ?? 0).getTime();
        const rightMs = new Date(right.access.activeEntitlement?.expiresAt ?? 0).getTime();
        return leftMs - rightMs;
      })
      .slice(0, 4);

    const pendingTransactions = transactions.items
      .filter((item) => item.paymentStatus === 'pending')
      .slice(0, 4);

    const accessCenter = buildAccessCenter(catalogCourses, transactions.items);
    const streak = buildLearningStreak(progressRows.map((row) => row.completedAt));
    const badges = buildMilestones({
      catalogCourses,
      savedNodesCount: savedNodes.length,
      savedCoursesCount: savedCourses.length,
      followedCreatorCount: followedCreatorIds.length,
      streak,
      paidTransactionCount: transactions.items.filter((item) => item.paymentStatus === 'paid').length,
    });
    const feedItems = options.includeFeed === false
      ? []
      : await this.buildFeed(followedCreatorIds, catalogCourses);

    return {
      stats: {
        publishedCourses: catalogCourses.length,
        continueLearningCourses: catalogCourses.filter((course) => Boolean(course.progress?.continueLearning)).length,
        activePremiumCourses: catalogCourses.filter((course) => Boolean(course.access.activeEntitlement)).length,
        pendingPayments: transactions.summary.pending,
        savedNodes: savedNodes.length,
        savedCourses: savedCourses.length,
        followedCreators: followedCreatorIds.length,
      },
      continueLearningCourses,
      expiringCourses,
      pendingTransactions,
      savedNodes: savedNodes.slice(0, 5),
      savedCourses: savedCourses.slice(0, 4),
      catalogCourses,
      feed: {
        followedCreatorCount: followedCreatorIds.length,
        items: feedItems,
      },
      accessCenter,
      streak,
      badges,
    };
  }

  private async buildFeed(
    followedCreatorIds: string[],
    catalogCourses: CatalogCourseSummary[]
  ): Promise<LearnerFeedEvent[]> {
    if (followedCreatorIds.length === 0) {
      return [];
    }

    const followedCreatorIdSet = new Set(followedCreatorIds);
    const followedCourses = catalogCourses
      .filter((course) => followedCreatorIdSet.has(course.creatorUserId))
      .sort((left, right) => new Date(right.updatedAt).getTime() - new Date(left.updatedAt).getTime())
      .slice(0, 12);

    if (followedCourses.length === 0) {
      return [];
    }

    const courseTrees = await this.courseRepository.listCourseTreesByIds(
      followedCourses.map((course) => course.id)
    );
    const courseTreeById = new Map(courseTrees.map((course) => [course.id, course]));
    const items: LearnerFeedEvent[] = [];

    for (const course of followedCourses) {
      const courseTree = courseTreeById.get(course.id);
      const creatorName = courseTree?.creatorName ?? null;

      items.push({
        id: `course:${course.id}`,
        kind: 'course_published',
        creatorUserId: course.creatorUserId,
        creatorName,
        courseId: course.id,
        courseTitle: course.title,
        moduleId: null,
        moduleTitle: null,
        nodeId: null,
        nodeTitle: null,
        nodeType: null,
        occurredAt: course.createdAt,
        href: `/courses/${course.id}`,
        summary: `${creatorName ?? 'A creator'} published ${course.title}.`,
      });

      for (const module of courseTree?.modules ?? []) {
        items.push({
          id: `module:${module.id}`,
          kind: 'module_added',
          creatorUserId: course.creatorUserId,
          creatorName,
          courseId: course.id,
          courseTitle: course.title,
          moduleId: module.id,
          moduleTitle: module.title,
          nodeId: null,
          nodeTitle: null,
          nodeType: null,
          occurredAt: module.createdAt,
          href: `/courses/${course.id}`,
          summary: `${creatorName ?? 'A creator'} added module “${module.title}” in ${course.title}.`,
        });

        for (const node of module.nodes) {
          items.push({
            id: `node:${node.id}`,
            kind: 'node_added',
            creatorUserId: course.creatorUserId,
            creatorName,
            courseId: course.id,
            courseTitle: course.title,
            moduleId: module.id,
            moduleTitle: module.title,
            nodeId: node.id,
            nodeTitle: node.title,
            nodeType: node.type,
            occurredAt: node.createdAt,
            href: `/courses/${course.id}/nodes/${node.id}`,
            summary: `${creatorName ?? 'A creator'} launched node “${node.title}” in ${module.title}.`,
          });
        }
      }
    }

    return items
      .sort((left, right) => new Date(right.occurredAt).getTime() - new Date(left.occurredAt).getTime())
      .slice(0, 18);
  }
}

function buildAccessCenter(
  catalogCourses: CatalogCourseSummary[],
  transactions: Awaited<ReturnType<LearnerFinanceApplicationService['getLearnerTransactions']>>['items']
): LearnerAccessCenterView {
  const nowMs = Date.now();
  const activeCourses = [...catalogCourses]
    .filter((course) => Boolean(course.access.activeEntitlement))
    .sort(sortByExpiryAsc);

  const expiringSoonCourses = activeCourses.filter((course) => {
    const expiresAt = course.access.activeEntitlement?.expiresAt;
    if (!expiresAt) return false;
    const diffMs = new Date(expiresAt).getTime() - nowMs;
    return diffMs > 0 && diffMs <= 7 * dayMs;
  });

  const expiredCourses = transactions
    .filter((transaction) => {
      if (transaction.paymentStatus !== 'paid' || !transaction.accessExpiresAt) {
        return false;
      }
      return new Date(transaction.accessExpiresAt).getTime() <= nowMs;
    })
    .sort((left, right) => new Date(right.accessExpiresAt ?? 0).getTime() - new Date(left.accessExpiresAt ?? 0).getTime())
    .slice(0, 6);

  const recentUnlocks = transactions
    .filter((transaction) => transaction.paymentStatus === 'paid' && Boolean(transaction.accessExpiresAt))
    .sort((left, right) => {
      const leftDate = left.paidAt ?? left.createdAt;
      const rightDate = right.paidAt ?? right.createdAt;
      return new Date(rightDate).getTime() - new Date(leftDate).getTime();
    })
    .slice(0, 6);

  const pendingTransactions = transactions
    .filter((transaction) => transaction.paymentStatus === 'pending')
    .slice(0, 6);

  return {
    activeCourses,
    expiringSoonCourses,
    expiredCourses,
    recentUnlocks,
    pendingTransactions,
  };
}

function buildLearningStreak(completionDates: string[]): LearningStreakSummary {
  if (completionDates.length === 0) {
    return {
      currentDays: 0,
      longestDays: 0,
      totalActiveDays: 0,
      lastActiveAt: null,
      todayActive: false,
    };
  }

  const sortedDays = [...new Set(completionDates.map((value) => new Date(value).toISOString().slice(0, 10)))]
    .sort((left, right) => left.localeCompare(right));
  const daySet = new Set(sortedDays);
  const today = new Date().toISOString().slice(0, 10);

  let currentDays = 0;
  let cursor = new Date(`${today}T00:00:00.000Z`);
  while (daySet.has(cursor.toISOString().slice(0, 10))) {
    currentDays += 1;
    cursor = new Date(cursor.getTime() - dayMs);
  }

  let longestDays = 0;
  let streakRun = 0;
  let previousDate: Date | null = null;
  for (const day of sortedDays) {
    const currentDate = new Date(`${day}T00:00:00.000Z`);
    if (!previousDate) {
      streakRun = 1;
    } else {
      const diffDays = Math.round((currentDate.getTime() - previousDate.getTime()) / dayMs);
      streakRun = diffDays === 1 ? streakRun + 1 : 1;
    }
    longestDays = Math.max(longestDays, streakRun);
    previousDate = currentDate;
  }

  const lastActiveAt = [...completionDates].sort((left, right) => new Date(right).getTime() - new Date(left).getTime())[0] ?? null;

  return {
    currentDays,
    longestDays,
    totalActiveDays: sortedDays.length,
    lastActiveAt,
    todayActive: daySet.has(today),
  };
}

function buildMilestones(input: {
  catalogCourses: CatalogCourseSummary[];
  savedNodesCount: number;
  savedCoursesCount: number;
  followedCreatorCount: number;
  streak: LearningStreakSummary;
  paidTransactionCount: number;
}): MilestoneBadge[] {
  const anyProgressCourse = input.catalogCourses.find((course) => (course.progress?.completedNodeCount ?? 0) > 0) ?? null;
  const completedCourse = input.catalogCourses.find((course) => (course.progress?.completionPercent ?? 0) >= 100) ?? null;

  return [
    {
      id: 'first-steps',
      label: 'First steps',
      description: 'Complete your first node and unlock your personal learning momentum.',
      achieved: Boolean(anyProgressCourse),
      achievedAt: anyProgressCourse?.progress?.lastVisited?.visitedAt ?? null,
    },
    {
      id: 'premium-explorer',
      label: 'Premium explorer',
      description: 'Unlock your first premium course and start using timed access intelligently.',
      achieved: input.paidTransactionCount > 0,
      achievedAt: input.paidTransactionCount > 0 ? new Date().toISOString() : null,
    },
    {
      id: 'community-follower',
      label: 'Community follower',
      description: 'Follow creators to receive release feed updates as they publish new learning material.',
      achieved: input.followedCreatorCount > 0,
      achievedAt: input.followedCreatorCount > 0 ? new Date().toISOString() : null,
    },
    {
      id: 'study-curator',
      label: 'Study curator',
      description: 'Save nodes and courses you want to revisit later from one organized shelf.',
      achieved: input.savedNodesCount + input.savedCoursesCount >= 3,
      achievedAt: input.savedNodesCount + input.savedCoursesCount >= 3 ? new Date().toISOString() : null,
    },
    {
      id: 'streak-keeper',
      label: 'Streak keeper',
      description: 'Keep your daily learning streak alive and build consistency over time.',
      achieved: input.streak.longestDays >= 3,
      achievedAt: input.streak.longestDays >= 3 ? input.streak.lastActiveAt : null,
    },
    {
      id: 'course-finisher',
      label: 'Course finisher',
      description: 'Reach 100% completion in a course and convert progress into a finished learning path.',
      achieved: Boolean(completedCourse),
      achievedAt: completedCourse?.progress?.lastVisited?.visitedAt ?? null,
    },
  ];
}

function sortByExpiryAsc(left: CatalogCourseSummary, right: CatalogCourseSummary) {
  const leftMs = new Date(left.access.activeEntitlement?.expiresAt ?? 0).getTime();
  const rightMs = new Date(right.access.activeEntitlement?.expiresAt ?? 0).getTime();
  return leftMs - rightMs;
}

