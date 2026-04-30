import type {
  AdminMessage,
  AdminModerationAction,
  Course,
  CourseCertificateRequirement,
  CourseCertificateTemplate,
  CourseDetail,
  CourseEntitlement,
  CourseWishlistEntry,
  NodeBookmarkEntry,
  CourseNode,
  CourseNodePreview,
  CourseOverview,
  CoursePricingPlan,
  CoursePurchase,
  CourseTreeDetail,
  CourseModule,
  CreatorBalanceSummary,
  CreatorPremiumSale,
  IssuedCertificate,
  IssuedCertificateAdminRow,
  LearnerLastVisitedNode,
  LearnerNodeProgress,
  ModuleWithNodePreviews,
  ModuleWithNodes,
  NodeCommentLike,
  NodeDiscussionComment,
  NodeDiscussionThread,
  CourseReview,
  PaymentProvider,
  PlatformSettings,
  PublicUserSummary,
  QuizAttemptRecord,
  UserProfile,
  WithdrawalRequest,
} from '@/src/domain/models';
import { normalizeNodePayload } from '@/src/domain/nodePayloads';
import type { Database } from '@/types/database';

type UserProfileRow = Database['public']['Tables']['user_profiles']['Row'];
type CourseRow = Database['public']['Tables']['courses']['Row'];
type CourseModuleRow = Database['public']['Tables']['course_modules']['Row'];
type CourseNodeRow = Database['public']['Tables']['course_nodes']['Row'];
type LearnerNodeProgressRow = Database['public']['Tables']['learner_node_progress']['Row'];
type LearnerLastVisitedNodeRow = Database['public']['Tables']['learner_last_visited_nodes']['Row'];
type NodeBookmarkEntryRow = Database['public']['Tables']['node_bookmark_entries']['Row'];
type CreatorBalanceSummaryRow = Database['public']['Tables']['creator_balance_summaries']['Row'];
type QuizAttemptRow = Database['public']['Tables']['quiz_attempts']['Row'];
type WithdrawalRow = Database['public']['Tables']['withdrawal_requests']['Row'];
type NodeDiscussionThreadRow = Database['public']['Tables']['node_discussion_threads']['Row'];
type NodeDiscussionCommentRow = Database['public']['Tables']['node_discussion_comments']['Row'];
type NodeCommentLikeRow = Database['public']['Tables']['node_comment_likes']['Row'];
type CourseReviewRow = Database['public']['Tables']['course_reviews']['Row'];
type CourseWishlistEntryRow = Database['public']['Tables']['course_wishlist_entries']['Row'];
type AdminMessageRow = Database['public']['Tables']['admin_messages']['Row'];
type AdminModerationActionRow = Database['public']['Tables']['admin_moderation_actions']['Row'];
type PlatformSettingsRow = Database['public']['Tables']['platform_settings']['Row'];
type CoursePurchaseRow = Database['public']['Tables']['course_purchases']['Row'];
type CoursePricingPlanRow = Database['public']['Tables']['course_pricing_plans']['Row'];
type CourseEntitlementRow = Database['public']['Tables']['course_entitlements']['Row'];
type CourseCertificateTemplateRow = Database['public']['Tables']['course_certificate_templates']['Row'];
type CourseCertificateRequirementRow =
  Database['public']['Tables']['course_certificate_requirements']['Row'];
type IssuedCertificateRow = Database['public']['Tables']['issued_certificates']['Row'];

export function mapUserProfile(row: UserProfileRow): UserProfile {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    username: (row as any).username ?? null,
    primaryRole: row.primary_role,
    themeMode: row.theme_mode,
    profilePhotoUrl: row.profile_photo_url,
    bio: row.bio,
    githubUsername: (row as any).github_username ?? null,
    githubProfileUrl: (row as any).github_profile_url ?? null,
    isAdmin: row.is_admin,
    isBanned: row.is_banned,
  };
}

export function mapPublicUserSummary(
  row: Pick<UserProfileRow, 'user_id' | 'full_name' | 'primary_role' | 'profile_photo_url' | 'bio' | 'is_banned'> & { username?: string | null }
): PublicUserSummary {
  return {
    userId: row.user_id,
    fullName: row.full_name,
    username: row.username ?? null,
    primaryRole: row.primary_role,
    profilePhotoUrl: row.profile_photo_url,
    bio: row.bio,
    isBanned: row.is_banned,
  };
}

export function mapCourse(row: CourseRow): Course {
  return {
    id: row.id,
    creatorUserId: row.creator_user_id,
    title: row.title,
    slug: row.slug,
    description: row.description,
    imageUrl: row.image_url,
    courseDomainId: row.course_domain_id,
    priceAmount: Number(row.price_amount),
    premiumEnabled: row.premium_enabled,
    premiumAccessDays: row.premium_access_days,
    premiumUpdatedAt: row.premium_updated_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCourseOverview(
  row: CourseRow,
  input: {
    moduleCount: number;
    nodeCount: number;
    premiumNodeCount: number;
    creatorName?: string | null;
    creatorUsername?: string | null;
    domainName?: string | null;
    domainSlug?: string | null;
    wishlistCount?: number;
    averageRating?: number;
    totalReviews?: number;
    activeLearnerCount?: number;
  }
): CourseOverview {
  return {
    ...mapCourse(row),
    creatorName: input.creatorName ?? null,
    creatorUsername: input.creatorUsername ?? null,
    domainName: input.domainName ?? null,
    domainSlug: input.domainSlug ?? null,
    moduleCount: input.moduleCount,
    nodeCount: input.nodeCount,
    premiumNodeCount: input.premiumNodeCount,
    engagement: {
      wishlistCount: input.wishlistCount ?? 0,
      averageRating: input.averageRating ?? 0,
      totalReviews: input.totalReviews ?? 0,
      activeLearnerCount: input.activeLearnerCount ?? 0,
    },
  };
}

export function mapCourseModule(row: CourseModuleRow): CourseModule {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    summary: row.summary,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCourseNodePreview(row: Pick<CourseNodeRow, 'id' | 'module_id' | 'type' | 'title' | 'is_premium' | 'excerpt' | 'position' | 'created_at' | 'updated_at'>): CourseNodePreview {
  return {
    id: row.id,
    moduleId: row.module_id,
    type: row.type,
    title: row.title,
    isPremium: row.is_premium,
    excerpt: row.excerpt,
    position: row.position,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCourseNode(row: CourseNodeRow): CourseNode {
  return {
    ...mapCourseNodePreview(row),
    payload: normalizeNodePayload(row.type, row.payload),
  };
}

export function mapCourseDetail(input: {
  courseRow: CourseRow;
  creatorName: string | null;
  domainName?: string | null;
  domainSlug?: string | null;
  moduleRows: CourseModuleRow[];
  nodeRows: CourseNodeRow[];
}): CourseDetail {
  const nodesByModuleId = new Map<string, CourseNode[]>();

  for (const nodeRow of input.nodeRows) {
    const current = nodesByModuleId.get(nodeRow.module_id) ?? [];
    current.push(mapCourseNode(nodeRow));
    nodesByModuleId.set(nodeRow.module_id, current);
  }

  const modules: ModuleWithNodes[] = input.moduleRows.map((row) => ({
    ...mapCourseModule(row),
    nodes: (nodesByModuleId.get(row.id) ?? []).sort((left, right) => left.position - right.position),
  }));

  return {
    ...mapCourse(input.courseRow),
    creatorName: input.creatorName,
    domainName: input.domainName ?? null,
    domainSlug: input.domainSlug ?? null,
    modules: modules.sort((left, right) => left.position - right.position),
  };
}

export function mapCourseTreeDetail(input: {
  courseRow: CourseRow;
  creatorName: string | null;
  domainName?: string | null;
  domainSlug?: string | null;
  moduleRows: CourseModuleRow[];
  nodeRows: Array<Pick<CourseNodeRow, 'id' | 'module_id' | 'type' | 'title' | 'is_premium' | 'excerpt' | 'position' | 'created_at' | 'updated_at'>>;
}): CourseTreeDetail {
  const nodesByModuleId = new Map<string, CourseNodePreview[]>();

  for (const nodeRow of input.nodeRows) {
    const current = nodesByModuleId.get(nodeRow.module_id) ?? [];
    current.push(mapCourseNodePreview(nodeRow));
    nodesByModuleId.set(nodeRow.module_id, current);
  }

  const modules: ModuleWithNodePreviews[] = input.moduleRows.map((row) => ({
    ...mapCourseModule(row),
    nodes: (nodesByModuleId.get(row.id) ?? []).sort((left, right) => left.position - right.position),
  }));

  return {
    ...mapCourse(input.courseRow),
    creatorName: input.creatorName,
    domainName: input.domainName ?? null,
    domainSlug: input.domainSlug ?? null,
    modules: modules.sort((left, right) => left.position - right.position),
  };
}

export function mapAdminMessage(row: AdminMessageRow): AdminMessage {
  return {
    id: row.id,
    senderUserId: row.sender_user_id,
    senderRole: row.sender_role,
    subject: row.subject,
    message: row.message,
    messageType: row.message_type as AdminMessage['messageType'],
    targetUserId: row.target_user_id,
    status: row.status as AdminMessage['status'],
    reviewedByAdminUserId: row.reviewed_by_admin_user_id,
    reviewedAt: row.reviewed_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapAdminModerationAction(row: AdminModerationActionRow): AdminModerationAction {
  return {
    id: row.id,
    adminUserId: row.admin_user_id,
    targetUserId: row.target_user_id,
    sourceMessageId: row.source_message_id,
    actionType: row.action_type as AdminModerationAction['actionType'],
    reason: row.reason,
    createdAt: row.created_at,
  };
}

export function mapPlatformSettings(row: PlatformSettingsRow | null | undefined): PlatformSettings {
  return {
    currency: row?.currency ?? 'INR',
    platformFeePercent: Number(row?.platform_fee_percent ?? 20),
    platformFlatFeeAmount: Number(row?.platform_flat_fee_amount ?? 0),
    minimumWithdrawalAmount: Number(row?.minimum_withdrawal_amount ?? 500),
    settlementHoldDays: row?.settlement_hold_days ?? 0,
  };
}

export function mapCourseCertificateTemplate(row: CourseCertificateTemplateRow): CourseCertificateTemplate {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    templateConfig: (row.template_config ?? {}) as Record<string, unknown>,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCourseCertificateRequirement(
  row: CourseCertificateRequirementRow
): CourseCertificateRequirement {
  return {
    id: row.id,
    templateId: row.template_id,
    requirementType: row.requirement_type as CourseCertificateRequirement['requirementType'],
    requirementValue: (row.requirement_value ?? {}) as Record<string, unknown>,
    createdAt: row.created_at,
  };
}

export function mapIssuedCertificate(row: IssuedCertificateRow): IssuedCertificate {
  return {
    id: row.id,
    learnerUserId: row.learner_user_id,
    courseId: row.course_id,
    templateId: row.template_id,
    certificateCode: row.certificate_code,
    issuedAt: row.issued_at,
    pdfUrl: row.pdf_url,
    renderPayload: (row.render_payload ?? {}) as Record<string, unknown>,
  };
}

export function mapIssuedCertificateAdminRow(
  row: IssuedCertificateRow,
  input: {
    learnerName: string | null;
    courseTitle: string | null;
    templateTitle: string | null;
  }
): IssuedCertificateAdminRow {
  return {
    ...mapIssuedCertificate(row),
    learnerName: input.learnerName,
    courseTitle: input.courseTitle,
    templateTitle: input.templateTitle,
  };
}

export function mapCoursePurchase(row: CoursePurchaseRow): CoursePurchase {
  const paymentProvider =
    row.payment_provider === 'sandbox' || row.payment_provider === 'razorpay'
      ? (row.payment_provider as PaymentProvider)
      : null;

  return {
    id: row.id,
    courseId: row.course_id,
    learnerUserId: row.learner_user_id,
    creatorUserId: row.creator_user_id,
    grossAmount: Number(row.gross_amount),
    platformFeeAmount: Number(row.platform_fee_amount),
    creatorNetAmount: Number(row.creator_net_amount),
    currency: row.currency,
    paymentStatus: row.payment_status,
    paymentProvider,
    providerOrderId: row.provider_order_id,
    providerPaymentId: row.provider_payment_id,
    providerSignature: row.provider_signature,
    paidAt: row.paid_at,
    accessStartsAt: row.access_starts_at,
    accessExpiresAt: row.access_expires_at,
    pricingPlanId: row.pricing_plan_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCourseEntitlement(row: CourseEntitlementRow): CourseEntitlement {
  return {
    id: row.id,
    courseId: row.course_id,
    learnerUserId: row.learner_user_id,
    purchaseId: row.purchase_id,
    startsAt: row.starts_at,
    expiresAt: row.expires_at,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapLearnerNodeProgress(row: LearnerNodeProgressRow): LearnerNodeProgress {
  return {
    learnerUserId: row.learner_user_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    nodeId: row.node_id,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}

export function mapLearnerLastVisitedNode(row: LearnerLastVisitedNodeRow): LearnerLastVisitedNode {
  return {
    learnerUserId: row.learner_user_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    nodeId: row.node_id,
    visitedAt: row.visited_at,
    updatedAt: row.updated_at,
  };
}

export function mapCourseWishlistEntry(row: CourseWishlistEntryRow): CourseWishlistEntry {
  return {
    courseId: row.course_id,
    learnerUserId: row.learner_user_id,
    createdAt: row.created_at,
  };
}

export function mapNodeBookmarkEntry(row: NodeBookmarkEntryRow): NodeBookmarkEntry {
  return {
    learnerUserId: row.learner_user_id,
    courseId: row.course_id,
    moduleId: row.module_id,
    nodeId: row.node_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapCreatorBalanceSummary(row: CreatorBalanceSummaryRow): CreatorBalanceSummary {
  return {
    creatorUserId: row.creator_user_id,
    currency: row.currency,
    totalEarnedAmount: Number(row.total_earned_amount),
    pendingSettlementAmount: Number(row.pending_settlement_amount),
    availableAmount: Number(row.available_amount),
    withdrawnAmount: Number(row.withdrawn_amount),
    pendingWithdrawalAmount: Number(row.pending_withdrawal_amount),
    updatedAt: row.updated_at,
  };
}

export function mapWithdrawal(row: WithdrawalRow): WithdrawalRequest {
  return {
    id: row.id,
    creatorUserId: row.creator_user_id,
    amount: Number(row.amount),
    currency: row.currency,
    payoutMethodSnapshot: row.payout_method_snapshot,
    status: row.status,
    requestedAt: row.requested_at,
    processedAt: row.processed_at,
  };
}

export function mapCreatorPremiumSale(row: {
  purchase_id: string;
  course_id: string;
  course_title: string;
  learner_user_id: string;
  learner_name: string | null;
  gross_amount: number | string;
  platform_fee_amount: number | string;
  creator_net_amount: number | string;
  currency: string;
  payment_status: CreatorPremiumSale['paymentStatus'];
  paid_at: string | null;
  access_expires_at: string | null;
  purchase_kind: CreatorPremiumSale['purchaseKind'];
}): CreatorPremiumSale {
  return {
    purchaseId: row.purchase_id,
    courseId: row.course_id,
    courseTitle: row.course_title,
    learnerUserId: row.learner_user_id,
    learnerName: row.learner_name,
    grossAmount: Number(row.gross_amount),
    platformFeeAmount: Number(row.platform_fee_amount),
    creatorNetAmount: Number(row.creator_net_amount),
    currency: row.currency,
    paymentStatus: row.payment_status,
    paidAt: row.paid_at,
    accessExpiresAt: row.access_expires_at,
    purchaseKind: row.purchase_kind,
  };
}

export function mapQuizAttempt(row: QuizAttemptRow): QuizAttemptRecord {
  return {
    id: row.id,
    courseId: row.course_id,
    nodeId: row.node_id,
    learnerUserId: row.learner_user_id,
    score: row.score,
    maxScore: row.max_score,
    answers: row.answers as QuizAttemptRecord['answers'],
    submittedAt: row.submitted_at,
  };
}

export function mapNodeDiscussionThread(row: NodeDiscussionThreadRow): NodeDiscussionThread {
  return {
    id: row.id,
    courseId: row.course_id,
    nodeId: row.node_id,
    creatorUserId: row.creator_user_id,
    isOpen: row.is_open,
    unresolvedCount: row.unresolved_count,
    lastActivityAt: row.last_activity_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNodeDiscussionComment(row: NodeDiscussionCommentRow): NodeDiscussionComment {
  return {
    id: row.id,
    threadId: row.thread_id,
    courseId: row.course_id,
    nodeId: row.node_id,
    authorUserId: row.author_user_id,
    parentCommentId: row.parent_comment_id,
    rootCommentId: row.root_comment_id,
    commentTag: row.comment_tag,
    body: row.body,
    depth: row.depth,
    replyCount: row.reply_count,
    likeCount: row.like_count,
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    status: row.status,
    resolvedByUserId: row.resolved_by_user_id,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function mapNodeCommentLike(row: NodeCommentLikeRow): NodeCommentLike {
  return {
    commentId: row.comment_id,
    userId: row.user_id,
    createdAt: row.created_at,
  };
}

export function mapCourseReview(row: CourseReviewRow): CourseReview {
  return {
    id: row.id,
    courseId: row.course_id,
    reviewerUserId: row.reviewer_user_id,
    rating: row.rating,
    reviewText: row.review_text,
    isEdited: row.is_edited,
    isDeleted: row.is_deleted,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


export function mapCoursePricingPlan(row: CoursePricingPlanRow): CoursePricingPlan {
  return {
    id: row.id,
    courseId: row.course_id,
    title: row.title,
    description: row.description,
    priceAmount: Number(row.price_amount),
    accessDays: Number(row.access_days),
    position: row.position,
    isActive: row.is_active,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}


