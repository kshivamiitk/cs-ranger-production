import type {
  AdminFinanceDashboard,
  AdminFinanceTransaction,
  AdminMessage,
  AdminMessageDetail,
  AdminMessageStatus,
  AdminMessageType,
  AdminModerationAction,
  CatalogCourseQuery,
  CatalogCourseTreeView,
  Course,
  CourseReview,
  CourseReviewSummary,
  CourseReviewsView,
  CourseCertificateRequirement,
  CourseCertificateTemplate,
  CourseDetail,
  CourseEntitlement,
  CourseNode,
  CourseOverview,
  CoursePurchase,
  CoursePricingPlan,
  CourseWishlistEntry,
  CourseWishlistState,
  CreatorPayoutResult,
  CreatorPayoutWebhookEvent,
  CreatorLearnerDoubtListItem,
  CourseTreeDetail,
  AdminBulkPayoutConsole,
  AdminCreatorBalanceListItem,
  AdminWithdrawalQueueItem,
  BulkPayoutBatch,
  BulkPayoutBatchItem,
  BulkPayoutCandidate,
  CreatorPayoutProfile,
  CreatorBalanceSummary,
  CreatorCourseCertificateSummary,
  CreatorFinanceDashboard,
  CreatorFollowState,
  CreatorPremiumSale,
  CourseCollaborator,
  CourseCollaboratorAccess,
  CourseCollaboratorInvite,
  CourseCollaboratorRole,
  IssuedCertificate,
  IssuedCertificateAdminRow,
  LatexPreviewAsset,
  LatexPreviewResult,
  LearnerPremiumTransaction,
  ModerationActionType,
  MostSavedCourseSummary,
  ModuleWithNodes,
  NodeDiscussionComment,
  NodeDiscussionCommentView,
  NodeDiscussionPreview,
  NodeDiscussionThread,
  PaymentProvider,
  PayoutProvider,
  PlatformSettings,
  PremiumPaymentOrder,
  PremiumPaymentWebhookEvent,
  PremiumPurchaseFinalization,
  QuizAttemptRecord,
  LearnerLastVisitedNode,
  LearnerNodeProgress,
  NodeBookmarkEntry,
  SearchCreatorResult,
  SearchModuleResult,
  SearchNodeResult,
  SessionUser,
  TopCreatorsView,
  ThemeMode,
  UserProfile,
  UserRole,
  Viewer,
  WithdrawalRequest,
} from '@/src/domain/models';

export interface AuthResult {
  user: SessionUser | null;
  needsEmailConfirmation: boolean;
}

export interface AuthGateway {
  signUp(input: {
    email: string;
    password: string;
    fullName: string;
    username?: string | null;
    primaryRole: UserRole;
    redirectTo: string;
  }): Promise<AuthResult>;
  signIn(input: { email: string; password: string }): Promise<SessionUser>;
  signOut(): Promise<void>;
  beginGoogleOAuth(input: { redirectTo: string }): Promise<string>;
  exchangeCodeForSession(input: { code: string }): Promise<SessionUser | null>;
  getCurrentUser(): Promise<SessionUser | null>;
  requestPasswordReset(input: { email: string; redirectTo: string }): Promise<void>;
  updatePassword(input: { password: string }): Promise<void>;
}

export interface UserProfileRepository {
  getByUserId(userId: string): Promise<UserProfile | null>;
  getByUsername(username: string): Promise<UserProfile | null>;
  getPublicCreatorById(userId: string): Promise<UserProfile | null>;
  getPublicCreatorByHandle(handle: string): Promise<UserProfile | null>;
  searchCreatorsByUsername(input: { query: string; excludeUserId?: string | null; limit?: number }): Promise<UserProfile[]>;
  upsert(input: {
    userId: string;
    fullName: string | null;
    username?: string | null;
    primaryRole: UserRole;
    themeMode?: ThemeMode;
    profilePhotoUrl?: string | null;
    bio?: string | null;
    githubUsername?: string | null;
    githubProfileUrl?: string | null;
  }): Promise<UserProfile>;
  updateOwnProfile(input: {
    userId: string;
    fullName: string | null;
    username?: string | null;
    profilePhotoUrl: string | null;
    bio: string | null;
    themeMode: ThemeMode;
    githubUsername?: string | null;
    githubProfileUrl?: string | null;
  }): Promise<UserProfile>;
  updateThemeMode(userId: string, themeMode: ThemeMode): Promise<void>;
  setBannedState(targetUserId: string, isBanned: boolean): Promise<UserProfile>;
}

export interface CourseCollaborationRepository {
  getCourseAccess(input: { courseId: string; userId: string }): Promise<CourseCollaboratorAccess>;
  listAccessibleCourseIds(userId: string): Promise<string[]>;
  listCourseCollaborators(courseId: string): Promise<CourseCollaborator[]>;
  listCoursePendingInvites(courseId: string): Promise<CourseCollaboratorInvite[]>;
  listIncomingInvites(userId: string): Promise<CourseCollaboratorInvite[]>;
  inviteCollaborator(input: {
    courseId: string;
    inviterUserId: string;
    inviteeUserId: string;
    role?: CourseCollaboratorRole;
    message?: string | null;
  }): Promise<CourseCollaboratorInvite>;
  acceptInvite(input: { inviteId: string; userId: string }): Promise<CourseCollaboratorInvite>;
  declineInvite(input: { inviteId: string; userId: string }): Promise<CourseCollaboratorInvite>;
  revokeInvite(input: { inviteId: string; userId: string }): Promise<CourseCollaboratorInvite>;
  removeCollaborator(input: { courseId: string; actorUserId: string; collaboratorUserId: string }): Promise<void>;
}

export interface CourseRepository {
  createCourse(input: {
    creatorUserId: string;
    title: string;
    slug: string;
    description: string;
    imageUrl: string | null;
    domainName?: string | null;
    priceAmount: number;
    premiumEnabled: boolean;
    premiumAccessDays: number | null;
    status: Course['status'];
  }): Promise<Course>;
  updateCourse(input: {
    courseId: string;
    creatorUserId: string;
    title: string;
    slug: string;
    description: string;
    imageUrl: string | null;
    domainName?: string | null;
    priceAmount: number;
    premiumEnabled: boolean;
    premiumAccessDays: number | null;
    status: Course['status'];
  }): Promise<Course>;
  getCourseById(courseId: string): Promise<Course | null>;
  getCourseDetailById(courseId: string): Promise<CourseDetail | null>;
  getCourseTreeById(courseId: string): Promise<CourseTreeDetail | null>;
  listCourseTreesByIds(courseIds: string[]): Promise<CourseTreeDetail[]>;
  listCourseOverviewsByIds(courseIds: string[]): Promise<CourseOverview[]>;
  getReadableNodeById(nodeId: string): Promise<CourseNode | null>;
  listCreatorCourses(creatorUserId: string): Promise<CourseOverview[]>;
  listPublishedCourses(input?: CatalogCourseQuery): Promise<CourseOverview[]>;
  listPublishedCoursesByCreator(creatorUserId: string): Promise<CourseOverview[]>;
  createModule(input: {
    courseId: string;
    title: string;
    summary: string;
  }): Promise<ModuleWithNodes>;
  updateModule(input: {
    moduleId: string;
    title: string;
    summary: string;
  }): Promise<void>;
  deleteModule(input: {
    courseId: string;
    moduleId: string;
  }): Promise<void>;
  reorderModules(input: {
    courseId: string;
    moduleIdsInOrder: string[];
  }): Promise<void>;
  createNode(input: {
    moduleId: string;
    type: CourseNode['type'];
    title: string;
    payload: CourseNode['payload'];
    isPremium: boolean;
    excerpt: string | null;
  }): Promise<CourseNode>;
  updateNode(input: {
    nodeId: string;
    title: string;
    payload: CourseNode['payload'];
    isPremium: boolean;
    excerpt: string | null;
  }): Promise<void>;
  deleteNode(input: {
    moduleId: string;
    nodeId: string;
  }): Promise<void>;
  reorderNodes(input: {
    moduleId: string;
    nodeIdsInOrder: string[];
  }): Promise<void>;
  saveQuizAttempt(input: Omit<QuizAttemptRecord, 'id' | 'submittedAt'>): Promise<QuizAttemptRecord>;
}

export interface CreatorFollowRepository {
  followCreator(input: { creatorUserId: string; followerUserId: string }): Promise<void>;
  unfollowCreator(input: { creatorUserId: string; followerUserId: string }): Promise<void>;
  getFollowState(input: { creatorUserId: string; viewerUserId: string | null }): Promise<CreatorFollowState>;
  listFollowedCreatorIds(followerUserId: string): Promise<string[]>;
}

export interface SearchRepository {
  searchEverything(input: {
    query: string;
    viewerUserId?: string | null;
  }): Promise<{
    modules: SearchModuleResult[];
    nodes: SearchNodeResult[];
    creators: SearchCreatorResult[];
  }>;
  listTopCreators(input: {
    viewerUserId?: string | null;
    limit?: number;
  }): Promise<TopCreatorsView>;
}

export interface AdminRepository {
  createAdminMessage(input: {
    senderUserId: string;
    senderRole: UserRole;
    subject: string | null;
    message: string;
    messageType: AdminMessageType;
    targetUserId: string | null;
  }): Promise<AdminMessage>;
  listSenderMessages(senderUserId: string): Promise<AdminMessage[]>;
  listAdminMessages(input?: { senderRole?: UserRole; status?: AdminMessageStatus | null }): Promise<AdminMessageDetail[]>;
  getAdminMessageDetail(messageId: string): Promise<AdminMessageDetail | null>;
  updateAdminMessageStatus(input: {
    messageId: string;
    status: AdminMessageStatus;
    reviewedByAdminUserId: string;
  }): Promise<AdminMessage>;
  createModerationAction(input: {
    adminUserId: string;
    targetUserId: string;
    sourceMessageId: string | null;
    actionType: ModerationActionType;
    reason: string | null;
  }): Promise<AdminModerationAction>;
}

export interface FinanceRepository {
  getPlatformSettings(): Promise<PlatformSettings>;
  updatePlatformSettings(input: {
    adminUserId: string;
    platformFeePercent: number;
    minimumWithdrawalAmount: number;
    settlementHoldDays: number;
  }): Promise<PlatformSettings>;
  getCreatorBalanceSummary(creatorUserId: string): Promise<CreatorBalanceSummary>;
  listCreatorWithdrawalRequests(creatorUserId: string): Promise<WithdrawalRequest[]>;
  listCreatorPremiumSales(creatorUserId: string): Promise<CreatorPremiumSale[]>;
  getCreatorFinanceDashboard(creatorUserId: string): Promise<CreatorFinanceDashboard>;
  getActiveEntitlement(input: { learnerUserId: string; courseId: string }): Promise<CourseEntitlement | null>;
  listActiveEntitlements(input: { learnerUserId: string; courseIds: string[] }): Promise<CourseEntitlement[]>;
  listLearnerPremiumTransactions(learnerUserId: string): Promise<LearnerPremiumTransaction[]>;
  listCoursePricingPlans(courseId: string): Promise<CoursePricingPlan[]>;
  getCoursePricingPlanById(planId: string): Promise<CoursePricingPlan | null>;
  getCoursePurchaseById(purchaseId: string): Promise<CoursePurchase | null>;
  getCoursePurchaseByProviderOrderId(providerOrderId: string): Promise<CoursePurchase | null>;
  createPendingPremiumPurchase(input: {
    purchaseId: string;
    learnerUserId: string;
    creatorUserId: string;
    courseId: string;
    purchasedAccessDays: number;
    pricingPlanId?: string | null;
    provider: PaymentProvider;
    grossAmount: number;
    platformFeeAmount: number;
    creatorNetAmount: number;
    currency: string;
  }): Promise<CoursePurchase>;
  attachPurchaseProviderOrderId(input: {
    purchaseId: string;
    provider: PaymentProvider;
    providerOrderId: string;
  }): Promise<CoursePurchase>;
  finalizePremiumPurchase(input: {
    purchaseId: string;
    providerPaymentId: string;
    providerSignature: string | null;
    paymentStatus: 'paid';
  }): Promise<PremiumPurchaseFinalization>;
  createWithdrawalRequest(input: {
    creatorUserId: string;
    amount: number;
    currency: string;
    payoutMethodSnapshot: string;
  }): Promise<WithdrawalRequest>;
  getCreatorPayoutProfile(creatorUserId: string): Promise<CreatorPayoutProfile | null>;
  saveCreatorPayoutProfile(input: {
    creatorUserId: string;
    payoutMethodSnapshot: string;
  }): Promise<CreatorPayoutProfile>;
  listBulkPayoutCandidates(): Promise<BulkPayoutCandidate[]>;
  listBulkPayoutBatches(limit?: number): Promise<BulkPayoutBatch[]>;
  createBulkPayoutBatch(input: {
    mode: 'manual_run' | 'scheduled_run';
    triggeredByAdminUserId: string | null;
    currency: string;
    minimumThresholdSnapshot: number;
    totalCreatorsSelected: number;
    totalAmountSelected: number;
    scheduledFor?: string | null;
    notes?: string | null;
  }): Promise<BulkPayoutBatch>;
  updateBulkPayoutBatch(input: {
    batchId: string;
    status: 'running' | 'completed' | 'partially_failed' | 'failed';
    totalAmountProcessed?: number;
    finishedAt?: string | null;
    startedAt?: string | null;
    notes?: string | null;
  }): Promise<BulkPayoutBatch>;
  createBulkPayoutBatchItem(input: {
    batchId: string;
    creatorUserId: string;
    eligibleAmount: number;
    currency: string;
    status: 'selected' | 'pending' | 'processed' | 'failed' | 'skipped';
    creatorName?: string | null;
    withdrawalRequestId?: string | null;
    skipReason?: string | null;
    failureReason?: string | null;
    providerPayoutId?: string | null;
    idempotencyKey?: string | null;
  }): Promise<BulkPayoutBatchItem>;
  getWithdrawalRequestById(withdrawalRequestId: string): Promise<WithdrawalRequest | null>;
  finalizeWithdrawalFromPayout(input: {
    withdrawalRequestId: string;
    status: 'paid' | 'rejected';
  }): Promise<WithdrawalRequest>;
  updateWithdrawalStatus(input: {
    adminUserId: string;
    withdrawalRequestId: string;
    status: 'paid' | 'rejected';
  }): Promise<WithdrawalRequest>;
  getAdminFinanceDashboard(): Promise<AdminFinanceDashboard>;
  getAdminCreatorPayoutsData(): Promise<{
    settings: PlatformSettings;
    creatorBalances: AdminCreatorBalanceListItem[];
    withdrawals: AdminWithdrawalQueueItem[];
  }>;
  listAdminFinanceTransactions(): Promise<AdminFinanceTransaction[]>;
}

export interface NodeDiscussionRepository {
  getThreadByNodeId(nodeId: string): Promise<NodeDiscussionThread | null>;
  getOrCreateThreadForNode(nodeId: string): Promise<NodeDiscussionThread>;
  listCommentsByNodeId(input: {
    nodeId: string;
    viewerUserId: string | null;
  }): Promise<NodeDiscussionCommentView[]>;
  createComment(input: {
    id: string;
    threadId: string;
    courseId: string;
    nodeId: string;
    authorUserId: string;
    parentCommentId: string | null;
    rootCommentId: string;
    commentTag: 'discussion' | 'doubt';
    depth: number;
    body: string;
  }): Promise<NodeDiscussionComment>;
  updateComment(input: {
    commentId: string;
    actorUserId: string;
    body: string;
  }): Promise<NodeDiscussionComment>;
  softDeleteComment(commentId: string, actorUserId: string): Promise<NodeDiscussionComment>;
  toggleLike(commentId: string, actorUserId: string): Promise<{ liked: boolean; likeCount: number }>;
  markRootCommentResolved(commentId: string, actorUserId: string): Promise<NodeDiscussionComment>;
  reopenRootComment(commentId: string, actorUserId: string): Promise<NodeDiscussionComment>;
  listCreatorLearnerDoubts(creatorUserId: string): Promise<CreatorLearnerDoubtListItem[]>;
  listNodeDiscussionPreview(nodeId: string): Promise<NodeDiscussionPreview | null>;
  getCommentById(commentId: string): Promise<NodeDiscussionComment | null>;
  canUserCommentOnNode(input: { nodeId: string; userId: string }): Promise<boolean>;
}

export interface CourseReviewRepository {
  listCourseReviews(input: {
    courseId: string;
    viewerUserId: string | null;
  }): Promise<CourseReviewsView['reviews']>;
  getCourseReviewSummary(courseId: string): Promise<CourseReviewSummary>;
  upsertCourseReview(input: {
    courseId: string;
    reviewerUserId: string;
    rating: number;
    reviewText: string | null;
  }): Promise<CourseReview>;
  softDeleteCourseReview(reviewId: string, actorUserId: string): Promise<CourseReview>;
  getReviewerReviewForCourse(courseId: string, reviewerUserId: string): Promise<CourseReview | null>;
  canUserReviewCourse(input: { courseId: string; userId: string }): Promise<boolean>;
}

export interface LearnerProgressRepository {
  listNodeProgressByCourses(input: {
    learnerUserId: string;
    courseIds: string[];
  }): Promise<LearnerNodeProgress[]>;
  listLastVisitedNodes(input: {
    learnerUserId: string;
    courseIds: string[];
  }): Promise<LearnerLastVisitedNode[]>;
  upsertNodeCompletion(input: {
    learnerUserId: string;
    courseId: string;
    moduleId: string;
    nodeId: string;
  }): Promise<LearnerNodeProgress>;
  deleteNodeCompletion(input: {
    learnerUserId: string;
    nodeId: string;
  }): Promise<void>;
  upsertLastVisitedNode(input: {
    learnerUserId: string;
    courseId: string;
    moduleId: string;
    nodeId: string;
  }): Promise<LearnerLastVisitedNode>;
}

export interface NodeBookmarkRepository {
  listBookmarksByLearner(learnerUserId: string): Promise<NodeBookmarkEntry[]>;
  listBookmarkedNodeIds(input: {
    learnerUserId: string;
    nodeIds: string[];
  }): Promise<string[]>;
  addBookmark(input: {
    learnerUserId: string;
    courseId: string;
    moduleId: string;
    nodeId: string;
  }): Promise<NodeBookmarkEntry>;
  removeBookmark(input: {
    learnerUserId: string;
    nodeId: string;
  }): Promise<void>;
}

export interface WishlistRepository {
  listWishlistStates(input: {
    learnerUserId: string;
    courseIds: string[];
  }): Promise<CourseWishlistState[]>;
  addWishlistEntry(input: {
    courseId: string;
    learnerUserId: string;
  }): Promise<CourseWishlistEntry>;
  removeWishlistEntry(input: {
    courseId: string;
    learnerUserId: string;
  }): Promise<void>;
  listWishlistEntriesForLearner(learnerUserId: string): Promise<CourseWishlistEntry[]>;
  listMostSavedCourses(limit: number): Promise<MostSavedCourseSummary[]>;
}

export interface CertificateRepository {
  getActiveTemplate(courseId: string): Promise<CourseCertificateTemplate | null>;
  listTemplateRequirements(templateId: string): Promise<CourseCertificateRequirement[]>;
  getIssuedCertificate(input: { learnerUserId: string; courseId: string }): Promise<IssuedCertificate | null>;
  issueCertificate(input: {
    learnerUserId: string;
    courseId: string;
    templateId: string;
    renderPayload: Record<string, unknown>;
  }): Promise<IssuedCertificate>;
  listLearnerQuizAttempts(input: { learnerUserId: string; courseId: string }): Promise<QuizAttemptRecord[]>;
  listCourseQuizNodeIds(courseId: string): Promise<string[]>;
  listCourseCertificateSummariesForCreator(creatorUserId: string): Promise<CreatorCourseCertificateSummary[]>;
  listIssuedCertificatesForAdmin(): Promise<IssuedCertificateAdminRow[]>;
}

export interface PaymentGatewayPort {
  getProvider(): PaymentProvider;
  createPremiumOrder(input: {
    purchaseId: string;
    courseId: string;
    title: string;
    amount: number;
    currency: string;
    learner: Viewer;
  }): Promise<PremiumPaymentOrder>;
  verifyPremiumPayment(input: {
    provider: PaymentProvider;
    providerOrderId: string;
    providerPaymentId: string;
    providerSignature: string | null;
    amount: number;
    currency: string;
  }): Promise<{ verified: true; provider: PaymentProvider }>;
  parsePremiumWebhook(input: {
    provider: PaymentProvider;
    rawBody: string;
    signature: string | null;
  }): Promise<PremiumPaymentWebhookEvent | null>;
}

export interface PayoutGatewayPort {
  getProvider(): PayoutProvider;
  createCreatorPayout(input: {
    withdrawalRequestId: string;
    creatorUserId: string;
    creatorName: string | null;
    creatorEmail: string;
    amount: number;
    currency: string;
    payoutMethodSnapshot: string;
  }): Promise<CreatorPayoutResult>;
  parseCreatorPayoutWebhook(input: {
    provider: Extract<PayoutProvider, 'razorpayx'>;
    rawBody: string;
    signature: string | null;
  }): Promise<CreatorPayoutWebhookEvent | null>;
}

export interface LatexPreviewGateway {
  compilePreview(input: { source: string }): Promise<LatexPreviewResult>;
  getPreviewAsset(previewKey: string): Promise<LatexPreviewAsset | null>;
}


