export type UserRole = 'learner' | 'creator';
export type ThemeMode = 'light' | 'dark' | 'ocean' | 'forest' | 'ember';
export type CourseStatus = 'draft' | 'published';
export type NodeType = 'content' | 'html' | 'question' | 'quiz' | 'video' | 'pdf' | 'github';
export type RichTextFormat = 'markdown' | 'latex';
export type LatexSourceMode = 'fragment' | 'document';
export type QuizOptionKey = 'A' | 'B' | 'C' | 'D';
export type WithdrawalStatus = 'pending' | 'approved' | 'rejected' | 'paid';
export type AdminMessageType = 'suggestion' | 'complaint' | 'support';
export type AdminMessageStatus = 'open' | 'reviewed' | 'closed';
export type ModerationActionType = 'ban' | 'unban' | 'warn';
export type PaymentStatus = 'pending' | 'paid' | 'failed' | 'cancelled' | 'refunded';
export type PaymentProvider = 'sandbox' | 'razorpay';
export type PayoutProvider = 'sandbox' | 'razorpayx';
export type EntitlementStatus = 'active' | 'expired' | 'revoked';
export type PremiumAccessGateReason = 'login_required' | 'premium_purchase_required' | null;
export type PremiumPurchaseKind = 'initial' | 'renewal';
export type CoursePremiumState = 'free' | 'premium_ready' | 'pricing_incomplete';
export type NodeDiscussionCommentStatus = 'open' | 'resolved';
export type NodeDiscussionCommentTag = 'discussion' | 'doubt';
export type CatalogPremiumFilter = 'all' | 'free' | 'premium';
export type CatalogSortKey = 'newest' | 'most_popular' | 'best_rated';
export type CertificateRequirementType =
  | 'all_quiz_nodes_attempted'
  | 'quiz_node_min_score'
  | 'course_quiz_average_min_score';

export interface LatexPreviewReady {
  status: 'ready';
  previewKey: string;
  mode: LatexSourceMode;
  sourceHash: string;
  cached: boolean;
}

export type LatexPreviewErrorKind =
  | 'compile_error'
  | 'compiler_missing'
  | 'render_failed'
  | 'package_missing'
  | 'timeout';

export interface LatexPreviewError {
  status: 'error';
  kind: LatexPreviewErrorKind;
  mode: LatexSourceMode;
  error: string;
  diagnostics: string[];
  lineNumber: number | null;
  focus: string | null;
  hint: string | null;
  sourceHash: string;
  cached: boolean;
}

export type LatexPreviewResult = LatexPreviewReady | LatexPreviewError;

export interface LatexPreviewAsset {
  previewKey: string;
  bytes: Uint8Array;
  etag: string;
  contentType: string;
}

export interface SessionUser {
  id: string;
  email: string;
  fullName: string | null;
}

export interface UserProfile {
  userId: string;
  fullName: string | null;
  username?: string | null;
  primaryRole: UserRole;
  themeMode: ThemeMode;
  profilePhotoUrl: string | null;
  bio: string | null;
  githubUsername?: string | null;
  githubProfileUrl?: string | null;
  isAdmin: boolean;
  isBanned: boolean;
}

export interface Viewer {
  user: SessionUser;
  profile: UserProfile;
}

export interface ViewerContext {
  viewer: Viewer | null;
  themeMode: ThemeMode;
}

export interface PublicUserSummary {
  userId: string;
  fullName: string | null;
  username?: string | null;
  primaryRole: UserRole;
  profilePhotoUrl: string | null;
  bio: string | null;
  githubUsername?: string | null;
  githubProfileUrl?: string | null;
  isBanned: boolean;
}

export interface CourseDomain {
  id: string;
  name: string;
  slug: string;
  normalizedName: string;
  createdByUserId: string | null;
  createdAt: string;
}

export interface Course {
  id: string;
  creatorUserId: string;
  title: string;
  slug: string;
  description: string;
  imageUrl: string | null;
  courseDomainId?: string | null;
  priceAmount: number;
  premiumEnabled: boolean;
  premiumAccessDays: number | null;
  premiumUpdatedAt: string | null;
  status: CourseStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseOverview extends Course {
  creatorName?: string | null;
  creatorUsername?: string | null;
  domainName?: string | null;
  domainSlug?: string | null;
  ownershipType?: 'owner' | 'collaborator';
  collaboratorRole?: CourseCollaboratorRole | null;
  moduleCount: number;
  nodeCount: number;
  premiumNodeCount: number;
  engagement: CourseEngagementSummary;
}

export interface CourseEntitlement {
  id: string;
  courseId: string;
  learnerUserId: string;
  purchaseId: string;
  startsAt: string;
  expiresAt: string;
  status: EntitlementStatus;
  createdAt: string;
  updatedAt: string;
}

export interface CourseAccessState {
  isOwner: boolean;
  premiumEnabled: boolean;
  courseIsFree: boolean;
  hasActiveEntitlement: boolean;
  activeEntitlement: CourseEntitlement | null;
  viewerCanAccessPremium: boolean;
  canPurchasePremium: boolean;
  canRenewPremium: boolean;
  gateReason: PremiumAccessGateReason;
  gateMessage: string | null;
}

export interface CourseModule {
  id: string;
  courseId: string;
  title: string;
  summary: string;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface RichContentSection {
  format: RichTextFormat;
  content: string;
}

export interface ContentNodePayload {
  introduction: RichContentSection;
  explanation: RichContentSection;
  solvedExamples: RichContentSection;
}

export interface HtmlNodePayload {
  html: string;
  css: string;
  javascript: string;
}

export interface QuestionItem {
  id: string;
  prompt: string;
  solution: string;
}

export interface QuestionNodePayload {
  format: RichTextFormat;
  items: QuestionItem[];
}

export interface QuizQuestionItem {
  id: string;
  prompt: string;
  options: Record<QuizOptionKey, string>;
  correctOption: QuizOptionKey;
  explanation?: string | null;
  points?: number;
  sourceFormat?: 'builder' | 'json';
}

export interface QuizNodePayload {
  format: RichTextFormat;
  timerSeconds: number;
  items: QuizQuestionItem[];
  sourceFormat?: 'builder' | 'json';
  rawJson?: string | null;
}

export interface VideoNodePayload {
  format: RichTextFormat;
  videoUrl: string;
  note: string;
}

export interface PdfNodePayload {
  pdfUrl: string;
  title?: string | null;
  note: string;
}

export type NodePayload =
  | ContentNodePayload
  | HtmlNodePayload
  | QuestionNodePayload
  | QuizNodePayload
  | VideoNodePayload
  | PdfNodePayload;

export interface CourseNode<TPayload extends NodePayload = NodePayload> {
  id: string;
  moduleId: string;
  type: NodeType;
  title: string;
  payload: TPayload;
  isPremium: boolean;
  excerpt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface CourseNodePreview {
  id: string;
  moduleId: string;
  type: NodeType;
  title: string;
  isPremium: boolean;
  excerpt: string | null;
  position: number;
  createdAt: string;
  updatedAt: string;
}

export interface ModuleWithNodes extends CourseModule {
  nodes: CourseNode[];
}

export interface ModuleWithNodePreviews extends CourseModule {
  nodes: CourseNodePreview[];
}

export interface CourseDetail extends Course {
  creatorName?: string | null;
  domainName?: string | null;
  domainSlug?: string | null;
  modules: ModuleWithNodes[];
}

export interface CourseTreeDetail extends Course {
  creatorName?: string | null;
  domainName?: string | null;
  domainSlug?: string | null;
  modules: ModuleWithNodePreviews[];
}

export interface CourseTreeNode extends CourseNodePreview {
  isLocked: boolean;
  isCompleted: boolean;
}

export interface CourseTreeModule extends CourseModule {
  nodes: CourseTreeNode[];
  accessibleNodeCount: number;
  completedNodeCount: number;
  completionPercent: number;
}

export interface CourseEngagementSummary {
  wishlistCount: number;
  averageRating: number;
  totalReviews: number;
  activeLearnerCount: number;
}

export interface LearnerNodeProgress {
  learnerUserId: string;
  courseId: string;
  moduleId: string;
  nodeId: string;
  completedAt: string;
  updatedAt: string;
}

export interface LearnerLastVisitedNode {
  learnerUserId: string;
  courseId: string;
  moduleId: string;
  nodeId: string;
  visitedAt: string;
  updatedAt: string;
}

export interface CourseContinueLearningTarget {
  courseId: string;
  moduleId: string;
  moduleTitle: string;
  nodeId: string;
  nodeTitle: string;
  nodeType: NodeType;
}

export interface ModuleProgressSummary {
  moduleId: string;
  accessibleNodeCount: number;
  completedNodeCount: number;
  completionPercent: number;
}

export interface CourseProgressSummary {
  courseId: string;
  accessibleNodeCount: number;
  completedNodeCount: number;
  completionPercent: number;
  totalModuleCount: number;
  completedModuleCount: number;
  completedNodeIds: string[];
  moduleProgress: ModuleProgressSummary[];
  lastVisited: CourseContinueLearningTarget | null;
  continueLearning: CourseContinueLearningTarget | null;
}

export interface CourseWishlistEntry {
  courseId: string;
  learnerUserId: string;
  createdAt: string;
}

export interface NodeBookmarkEntry {
  learnerUserId: string;
  courseId: string;
  moduleId: string;
  nodeId: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeBookmarkState {
  nodeId: string;
  isBookmarked: boolean;
  canBookmark: boolean;
}

export interface BookmarkedNodeView {
  savedAt: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  moduleId: string;
  moduleTitle: string;
  modulePosition: number;
  nodeId: string;
  nodeTitle: string;
  nodeType: NodeType;
  nodeExcerpt: string | null;
  isPremium: boolean;
  isLocked: boolean;
}

export interface CourseWishlistState {
  courseId: string;
  isWishlisted: boolean;
  wishlistCount: number;
  canWishlist: boolean;
}

export interface WishlistedCourseView {
  savedAt: string;
  course: CatalogCourseSummary;
}

export interface MostSavedCourseSummary {
  courseId: string;
  courseTitle: string;
  creatorUserId: string;
  creatorName: string | null;
  wishlistCount: number;
}

export interface CatalogCourseQuery {
  query?: string | null;
  premiumFilter?: CatalogPremiumFilter;
  minRating?: number | null;
  sort?: CatalogSortKey;
  domainSlug?: string | null;
  limit?: number | null;
}

export interface CatalogCourseSummary extends CourseOverview {
  access: CourseAccessState;
  progress: CourseProgressSummary | null;
  wishlist: CourseWishlistState;
}

export interface CatalogCourseTreeView {
  course: Omit<CourseTreeDetail, 'modules'> & { modules: CourseTreeModule[] };
  overview: CourseOverview;
  access: CourseAccessState;
}

export interface CatalogCourseWorkspaceView {
  course: Omit<CourseTreeDetail, 'modules'> & { modules: CourseTreeModule[] };
  overview: CourseOverview;
  access: CourseAccessState;
  progress: CourseProgressSummary | null;
  activeModule: Pick<CourseModule, 'id' | 'title' | 'summary' | 'position'> | null;
  activeNodeSummary: CourseTreeNode | null;
  activeNode: CourseNode | null;
  previousNode: CourseNodeLink | null;
  nextNode: CourseNodeLink | null;
}

export interface CourseNodeLink {
  id: string;
  title: string;
  type: NodeType;
  position: number;
  moduleId: string;
  moduleTitle: string;
  modulePosition: number;
  isPremium: boolean;
  isLocked: boolean;
}

export interface CatalogCourseNodeView {
  course: Pick<
    CourseDetail,
    'id' | 'title' | 'description' | 'imageUrl' | 'priceAmount' | 'premiumEnabled' | 'premiumAccessDays'
  >;
  overview: CourseOverview;
  access: CourseAccessState;
  progress: CourseProgressSummary | null;
  module: Pick<ModuleWithNodes, 'id' | 'title' | 'summary' | 'position'> | null;
  nodeSummary: CourseTreeNode | null;
  node: CourseNode | null;
  nodeLocked: boolean;
  nodeCompleted: boolean;
  previousNode: CourseNodeLink | null;
  nextNode: CourseNodeLink | null;
}

export interface NodeDiscussionThread {
  id: string;
  courseId: string;
  nodeId: string;
  creatorUserId: string;
  isOpen: boolean;
  unresolvedCount: number;
  lastActivityAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface NodeDiscussionComment {
  id: string;
  threadId: string;
  courseId: string;
  nodeId: string;
  authorUserId: string;
  parentCommentId: string | null;
  rootCommentId: string;
  commentTag: NodeDiscussionCommentTag;
  body: string;
  depth: number;
  replyCount: number;
  likeCount: number;
  isEdited: boolean;
  isDeleted: boolean;
  status: NodeDiscussionCommentStatus;
  resolvedByUserId: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface NodeCommentLike {
  commentId: string;
  userId: string;
  createdAt: string;
}

export interface NodeDiscussionCommentView extends NodeDiscussionComment {
  author: PublicUserSummary | null;
  viewerHasLiked: boolean;
  canEdit: boolean;
  canDelete: boolean;
  canReply: boolean;
  canResolve: boolean;
  canReopen: boolean;
}

export interface NodeDiscussionPreview {
  nodeId: string;
  nodeTitle: string;
  nodeType: NodeType;
  nodeIsPremium: boolean;
  courseId: string;
  courseTitle: string;
  courseStatus: CourseStatus;
  courseCreatorUserId: string;
  premiumEnabled: boolean;
  priceAmount: number;
  premiumAccessDays: number | null;
  thread: NodeDiscussionThread;
}

export interface NodeDiscussionView {
  preview: NodeDiscussionPreview;
  comments: NodeDiscussionCommentView[];
  canParticipate: boolean;
}

export interface CreatorLearnerDoubtListItem {
  commentId: string;
  threadId: string;
  courseId: string;
  courseTitle: string;
  courseCreatorUserId: string;
  nodeId: string;
  nodeTitle: string;
  nodeType: NodeType;
  learnerUserId: string;
  learnerName: string | null;
  parentCommentId: string | null;
  status: NodeDiscussionCommentStatus;
  isDeleted: boolean;
  commentBody: string;
  lastActivityAt: string;
  createdAt: string;
}

export interface CourseReview {
  id: string;
  courseId: string;
  reviewerUserId: string;
  rating: number;
  reviewText: string | null;
  isEdited: boolean;
  isDeleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseReviewViewItem extends CourseReview {
  reviewer: PublicUserSummary | null;
  canEdit: boolean;
  canDelete: boolean;
}

export interface CourseReviewSummary {
  courseId: string;
  averageRating: number;
  totalReviews: number;
  ratingBreakdown: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
  };
}

export interface CourseReviewsView {
  courseId: string;
  summary: CourseReviewSummary;
  reviews: CourseReviewViewItem[];
  ownReview: CourseReview | null;
  canReview: boolean;
  canReviewReason: string | null;
}

export interface CreatorFollowState {
  creatorUserId: string;
  followerCount: number;
  viewerIsFollowing: boolean;
}

export type CourseCollaboratorRole = 'editor';
export type CourseCollaboratorInviteStatus = 'pending' | 'accepted' | 'declined' | 'revoked';

export interface CourseCollaboratorAccess {
  courseId: string;
  userId: string;
  isOwner: boolean;
  collaboratorRole: CourseCollaboratorRole | null;
  canEditContent: boolean;
  canManageCollaborators: boolean;
  canManageSettings: boolean;
}

export interface CourseCollaborator {
  courseId: string;
  userId: string;
  role: CourseCollaboratorRole;
  addedByUserId: string;
  createdAt: string;
  user: PublicUserSummary | null;
}

export interface CourseCollaboratorInvite {
  id: string;
  courseId: string;
  courseTitle: string | null;
  inviterUserId: string;
  inviteeUserId: string;
  role: CourseCollaboratorRole;
  status: CourseCollaboratorInviteStatus;
  message: string | null;
  createdAt: string;
  respondedAt: string | null;
  inviter: PublicUserSummary | null;
  invitee: PublicUserSummary | null;
}

export interface CreatorPublicProfile {
  creator: PublicUserSummary;
  follow: CreatorFollowState;
  courses: CatalogCourseSummary[];
}


export type LearnerFeedEventKind = 'course_published' | 'module_added' | 'node_added';

export interface LearnerFeedEvent {
  id: string;
  kind: LearnerFeedEventKind;
  creatorUserId: string;
  creatorName: string | null;
  courseId: string;
  courseTitle: string;
  moduleId: string | null;
  moduleTitle: string | null;
  nodeId: string | null;
  nodeTitle: string | null;
  nodeType: NodeType | null;
  occurredAt: string;
  href: string;
  summary: string;
}

export interface LearningStreakSummary {
  currentDays: number;
  longestDays: number;
  totalActiveDays: number;
  lastActiveAt: string | null;
  todayActive: boolean;
}

export interface MilestoneBadge {
  id: string;
  label: string;
  description: string;
  achieved: boolean;
  achievedAt: string | null;
}

export interface LearnerAccessCenterView {
  activeCourses: CatalogCourseSummary[];
  expiringSoonCourses: CatalogCourseSummary[];
  expiredCourses: LearnerPremiumTransaction[];
  recentUnlocks: LearnerPremiumTransaction[];
  pendingTransactions: LearnerPremiumTransaction[];
}

export interface SearchModuleResult {
  id: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  title: string;
  summary: string;
  position: number;
}

export interface SearchNodeResult {
  id: string;
  courseId: string;
  courseTitle: string;
  moduleId: string;
  moduleTitle: string;
  modulePosition: number;
  title: string;
  type: NodeType;
  isPremium: boolean;
  isLocked: boolean;
  position: number;
  snippet: string;
}

export interface SearchCreatorResult {
  userId: string;
  fullName: string | null;
  username?: string | null;
  bio: string | null;
  profilePhotoUrl: string | null;
  followerCount: number;
  viewerIsFollowing: boolean;
}

export interface TopCreatorSummary {
  creator: PublicUserSummary;
  follow: CreatorFollowState;
  publishedCourseCount: number;
  publishedNodeCount: number;
  premiumCourseCount: number;
  featuredCourseTitles: string[];
}

export interface TopCreatorsView {
  byFollowers: TopCreatorSummary[];
  byContributions: TopCreatorSummary[];
}

export interface SearchResultBuckets {
  query: string;
  courses: CatalogCourseSummary[];
  modules: SearchModuleResult[];
  nodes: SearchNodeResult[];
  creators: SearchCreatorResult[];
}

export interface SearchDiscoveryResultBuckets extends SearchResultBuckets {
  queryOptions: Required<Pick<CatalogCourseQuery, 'premiumFilter' | 'sort'>> & {
    minRating: number | null;
  };
}

export interface AdminMessage {
  id: string;
  senderUserId: string;
  senderRole: UserRole;
  subject: string | null;
  message: string;
  messageType: AdminMessageType;
  targetUserId: string | null;
  status: AdminMessageStatus;
  reviewedByAdminUserId: string | null;
  reviewedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminMessageDetail extends AdminMessage {
  senderProfile: PublicUserSummary | null;
  targetProfile: PublicUserSummary | null;
  reviewedByProfile: PublicUserSummary | null;
}

export interface AdminModerationAction {
  id: string;
  adminUserId: string;
  targetUserId: string;
  sourceMessageId: string | null;
  actionType: ModerationActionType;
  reason: string | null;
  createdAt: string;
}

export type PayoutMode = 'manual' | 'self_withdrawal' | 'admin_bulk';

export interface PlatformSettings {
  currency: string;
  platformFeePercent: number;
  platformFlatFeeAmount: number;
  minimumWithdrawalAmount: number;
  settlementHoldDays: number;
}

export interface CreatorPayoutProfile {
  creatorUserId: string;
  payoutMethodSnapshot: string;
  maskedPayoutLabel: string;
  isVerified: boolean;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BulkPayoutCandidate {
  creatorUserId: string;
  creatorName: string | null;
  creatorEmail: string | null;
  availableAmount: number;
  currency: string;
  payoutProfile: CreatorPayoutProfile | null;
  eligible: boolean;
  reason: string | null;
}

export interface BulkPayoutBatch {
  id: string;
  mode: 'manual_run' | 'scheduled_run';
  status: 'draft' | 'running' | 'completed' | 'partially_failed' | 'failed';
  triggeredByAdminUserId: string | null;
  scheduledFor: string | null;
  startedAt: string | null;
  finishedAt: string | null;
  currency: string;
  minimumThresholdSnapshot: number;
  totalCreatorsSelected: number;
  totalAmountSelected: number;
  totalAmountProcessed: number;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface BulkPayoutBatchItem {
  id: string;
  batchId: string;
  creatorUserId: string;
  creatorName: string | null;
  withdrawalRequestId: string | null;
  eligibleAmount: number;
  currency: string;
  status: 'selected' | 'pending' | 'processed' | 'failed' | 'skipped';
  skipReason: string | null;
  failureReason: string | null;
  providerPayoutId: string | null;
  idempotencyKey: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AdminBulkPayoutConsole {
  settings: PlatformSettings;
  candidates: BulkPayoutCandidate[];
  eligibleCandidates: BulkPayoutCandidate[];
  skippedCandidates: BulkPayoutCandidate[];
  batches: BulkPayoutBatch[];
  nextScheduledLabel: string | null;
}

export interface CourseCertificateTemplate {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  templateConfig: Record<string, unknown>;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CourseCertificateRequirement {
  id: string;
  templateId: string;
  requirementType: CertificateRequirementType;
  requirementValue: Record<string, unknown>;
  createdAt: string;
}

export interface IssuedCertificate {
  id: string;
  learnerUserId: string;
  courseId: string;
  templateId: string;
  certificateCode: string;
  issuedAt: string;
  pdfUrl: string | null;
  renderPayload: Record<string, unknown>;
}

export interface CertificateEligibility {
  eligible: boolean;
  reason: string | null;
  template: CourseCertificateTemplate | null;
  requirements: CourseCertificateRequirement[];
  issuedCertificate: IssuedCertificate | null;
}

export interface PurchaseSettlement {
  grossAmount: number;
  platformFeeAmount: number;
  creatorNetAmount: number;
  currency: string;
}

export interface CoursePricingPlan {
  id: string;
  courseId: string;
  title: string;
  description: string | null;
  priceAmount: number;
  accessDays: number;
  position: number;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CoursePurchase {
  id: string;
  courseId: string;
  learnerUserId: string;
  creatorUserId: string;
  grossAmount: number;
  platformFeeAmount: number;
  creatorNetAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider | null;
  providerOrderId: string | null;
  providerPaymentId: string | null;
  providerSignature: string | null;
  paidAt: string | null;
  accessStartsAt: string | null;
  accessExpiresAt: string | null;
  pricingPlanId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface LearnerPremiumTransaction {
  purchaseId: string;
  courseId: string;
  courseTitle: string;
  courseImageUrl: string | null;
  creatorUserId: string;
  creatorName: string | null;
  grossAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider | null;
  providerOrderId: string | null;
  paidAt: string | null;
  accessExpiresAt: string | null;
  pricingPlanId: string | null;
  createdAt: string;
  purchaseKind: PremiumPurchaseKind;
  canResumePayment: boolean;
}

export interface PremiumPaymentOrder {
  purchaseId: string;
  pricingPlanId: string | null;
  courseId: string;
  provider: PaymentProvider;
  providerOrderId: string;
  amount: number;
  currency: string;
  checkoutKey: string | null;
  checkoutMode: 'sandbox' | 'razorpay';
}

export interface PremiumPaymentWebhookEvent {
  provider: PaymentProvider;
  providerOrderId: string;
  providerPaymentId: string | null;
  providerSignature: string | null;
  paymentStatus: PaymentStatus;
  eventType: string;
}

export interface PremiumPurchaseFinalization {
  purchase: CoursePurchase;
  entitlement: CourseEntitlement;
  settlement: PurchaseSettlement;
  purchaseKind: PremiumPurchaseKind;
}

export interface CreatorPayoutResult {
  provider: PayoutProvider;
  payoutId: string | null;
  payoutStatus: string;
  status: 'processed' | 'pending' | 'failed';
  failureReason: string | null;
}

export interface CreatorPayoutWebhookEvent {
  provider: Extract<PayoutProvider, 'razorpayx'>;
  eventType: string;
  withdrawalRequestId: string | null;
  payoutId: string | null;
  payoutStatus: string | null;
  status: 'processed' | 'pending' | 'failed';
  failureReason: string | null;
}

export interface CreatorBalanceSummary {
  creatorUserId: string;
  currency: string;
  totalEarnedAmount: number;
  pendingSettlementAmount: number;
  availableAmount: number;
  withdrawnAmount: number;
  pendingWithdrawalAmount: number;
  updatedAt: string;
}

export interface WithdrawalRequest {
  id: string;
  creatorUserId: string;
  amount: number;
  currency: string;
  payoutMethodSnapshot: string;
  status: WithdrawalStatus;
  requestedAt: string;
  processedAt: string | null;
}

export interface CreatorPremiumSale {
  purchaseId: string;
  courseId: string;
  courseTitle: string;
  learnerUserId: string;
  learnerName: string | null;
  grossAmount: number;
  platformFeeAmount: number;
  creatorNetAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paidAt: string | null;
  accessExpiresAt: string | null;
  purchaseKind: PremiumPurchaseKind;
}

export interface CreatorFinanceDashboard {
  summary: CreatorBalanceSummary;
  withdrawals: WithdrawalRequest[];
  sales: CreatorPremiumSale[];
  settings: PlatformSettings;
}

export interface AdminFinanceSummary {
  totalGmv: number;
  totalPlatformRevenue: number;
  totalCreatorNetCredited: number;
  totalPendingSettlement: number;
  totalAvailableCreatorBalances: number;
  totalPendingWithdrawals: number;
  totalPaidWithdrawals: number;
  activePremiumEntitlementsCount: number;
  expiredPremiumEntitlementsCount: number;
}

export interface AdminFinanceTransaction {
  purchaseId: string;
  learnerUserId: string;
  learnerName: string | null;
  creatorUserId: string;
  creatorName: string | null;
  courseId: string;
  courseTitle: string;
  grossAmount: number;
  platformFeeAmount: number;
  creatorNetAmount: number;
  currency: string;
  paymentStatus: PaymentStatus;
  paymentProvider: PaymentProvider | null;
  paidAt: string | null;
  entitlementExpiresAt: string | null;
  purchaseKind: PremiumPurchaseKind;
}

export interface AdminWithdrawalQueueItem extends WithdrawalRequest {
  creatorName: string | null;
}

/** Per-creator wallet snapshot for admin payout planning (names from profiles). */
export interface AdminCreatorBalanceListItem extends CreatorBalanceSummary {
  creatorName: string | null;
}

export interface AdminFinanceDashboard {
  settings: PlatformSettings;
  summary: AdminFinanceSummary;
  transactions: AdminFinanceTransaction[];
  withdrawals: AdminWithdrawalQueueItem[];
}

export interface CreatorCourseCertificateSummary {
  courseId: string;
  courseTitle: string;
  templateId: string | null;
  templateTitle: string | null;
  templateActive: boolean;
  issuedCount: number;
}

export interface IssuedCertificateAdminRow extends IssuedCertificate {
  learnerName: string | null;
  courseTitle: string | null;
  templateTitle: string | null;
}

export interface QuizAttemptRecord {
  id: string;
  courseId: string;
  nodeId: string;
  learnerUserId: string;
  score: number;
  maxScore: number;
  answers: Record<string, QuizOptionKey>;
  submittedAt: string;
}


export interface LearnerReportCardQuizRow {
  nodeId: string;
  nodeTitle: string;
  bestScore: number;
  maxScore: number;
  percentage: number;
  attemptsCount: number;
  lastSubmittedAt: string | null;
}

export interface LearnerReportCardCourseRow {
  courseId: string;
  courseTitle: string;
  averagePercentage: number;
  completedQuizCount: number;
  totalQuizCount: number;
  quizzes: LearnerReportCardQuizRow[];
}

export interface LearnerReportCardView {
  updatedAt: string;
  totalAttempts: number;
  courses: LearnerReportCardCourseRow[];
}
