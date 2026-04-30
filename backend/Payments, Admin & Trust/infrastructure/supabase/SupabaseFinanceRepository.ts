import {
  mapCourseEntitlement,
  mapCoursePurchase,
  mapCoursePricingPlan,
  mapCreatorBalanceSummary,
  mapCreatorPremiumSale,
  mapPlatformSettings,
  mapWithdrawal,
} from '@/src/infrastructure/supabase/mappers';
import type { FinanceRepository } from '@/src/domain/ports';
import type {
  AdminCreatorBalanceListItem,
  AdminFinanceDashboard,
  AdminFinanceSummary,
  AdminFinanceTransaction,
  AdminWithdrawalQueueItem,
  BulkPayoutBatch,
  BulkPayoutBatchItem,
  BulkPayoutCandidate,
  CourseEntitlement,
  CoursePricingPlan,
  CreatorBalanceSummary,
  CreatorFinanceDashboard,
  CreatorPayoutProfile,
  CreatorPremiumSale,
  LearnerPremiumTransaction,
  PaymentProvider,
  PlatformSettings,
  PremiumPurchaseFinalization,
  WithdrawalRequest,
} from '@/src/domain/models';
import type {
  AppServiceSupabaseClient,
  AppSupabaseClient,
} from '@/src/infrastructure/supabase/serverClient';
import type { Database } from '@/types/database';
import { premiumPaymentDefaults } from '@/lib/payments';

type CoursePurchaseAccessRow = Pick<
  Database['public']['Tables']['course_purchases']['Row'],
  'id' | 'course_id' | 'learner_user_id' | 'access_starts_at' | 'access_expires_at' | 'created_at' | 'updated_at'
>;

type LearnerTransactionPurchaseRow = Pick<
  Database['public']['Tables']['course_purchases']['Row'],
  | 'id'
  | 'course_id'
  | 'learner_user_id'
  | 'creator_user_id'
  | 'gross_amount'
  | 'currency'
  | 'payment_status'
  | 'payment_provider'
  | 'provider_order_id'
  | 'paid_at'
  | 'access_starts_at'
  | 'access_expires_at'
  | 'pricing_plan_id'
  | 'created_at'
>;

function purchaseAccessIsActive(row: CoursePurchaseAccessRow, now = new Date()) {
  if (!row.access_expires_at) {
    return false;
  }

  if (new Date(row.access_expires_at).getTime() <= now.getTime()) {
    return false;
  }

  if (!row.access_starts_at) {
    return true;
  }

  return new Date(row.access_starts_at).getTime() <= now.getTime();
}

function mapPurchaseAccessToEntitlement(row: CoursePurchaseAccessRow): CourseEntitlement {
  return {
    id: `purchase-access:${row.id}`,
    courseId: row.course_id,
    learnerUserId: row.learner_user_id,
    purchaseId: row.id,
    startsAt: row.access_starts_at ?? row.created_at,
    expiresAt: row.access_expires_at ?? row.created_at,
    status: 'active',
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function normalizePayoutLabel(snapshot: string): string {
  const trimmed = snapshot.trim();
  if (!trimmed) {
    return 'No payout destination saved';
  }

  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed) as Record<string, unknown>;
      const type = typeof parsed.type === 'string' ? parsed.type.toLowerCase() : '';
      if (type === 'upi') {
        const vpa = typeof parsed.vpa === 'string' ? parsed.vpa.trim() : '';
        if (vpa) {
          const [user, handle] = vpa.split('@');
          return `UPI • ${user.slice(0, 2)}•••@${handle ?? 'bank'}`;
        }
      }
      const accountNumber = typeof parsed.accountNumber === 'string' ? parsed.accountNumber.replace(/\s+/g, '') : '';
      if (accountNumber) {
        return `Bank • ••••${accountNumber.slice(-4)}`;
      }
    } catch {
      return 'Saved payout JSON';
    }
  }

  if (trimmed.includes('@')) {
    const [user, handle] = trimmed.split('@');
    return `UPI • ${user.slice(0, 2)}•••@${handle ?? 'bank'}`;
  }

  return trimmed.length > 28 ? `${trimmed.slice(0, 28)}…` : trimmed;
}

function mapCreatorPayoutProfileRow(row: any): CreatorPayoutProfile {
  return {
    creatorUserId: row.creator_user_id,
    payoutMethodSnapshot: row.payout_method_snapshot,
    maskedPayoutLabel: row.masked_payout_label,
    isVerified: Boolean(row.is_verified),
    isActive: Boolean(row.is_active),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBulkPayoutBatchRow(row: any): BulkPayoutBatch {
  return {
    id: row.id,
    mode: row.mode,
    status: row.status,
    triggeredByAdminUserId: row.triggered_by_admin_user_id,
    scheduledFor: row.scheduled_for,
    startedAt: row.started_at,
    finishedAt: row.finished_at,
    currency: row.currency,
    minimumThresholdSnapshot: Number(row.minimum_threshold_snapshot ?? 0),
    totalCreatorsSelected: Number(row.total_creators_selected ?? 0),
    totalAmountSelected: Number(row.total_amount_selected ?? 0),
    totalAmountProcessed: Number(row.total_amount_processed ?? 0),
    notes: row.notes ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapBulkPayoutBatchItemRow(row: any): BulkPayoutBatchItem {
  return {
    id: row.id,
    batchId: row.batch_id,
    creatorUserId: row.creator_user_id,
    creatorName: row.creator_name ?? null,
    withdrawalRequestId: row.withdrawal_request_id ?? null,
    eligibleAmount: Number(row.eligible_amount ?? 0),
    currency: row.currency,
    status: row.status,
    skipReason: row.skip_reason ?? null,
    failureReason: row.failure_reason ?? null,
    providerPayoutId: row.provider_payout_id ?? null,
    idempotencyKey: row.idempotency_key ?? null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export class SupabaseFinanceRepository implements FinanceRepository {
  constructor(
    private readonly supabase: AppSupabaseClient,
    private readonly serviceSupabase: AppServiceSupabaseClient
  ) {}

  private async getFallbackPurchaseAccess(input: { learnerUserId: string; courseId: string }) {
    const now = new Date();
    const nowIso = now.toISOString();
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .select('id, course_id, learner_user_id, access_starts_at, access_expires_at, created_at, updated_at')
      .eq('learner_user_id', input.learnerUserId)
      .eq('course_id', input.courseId)
      .eq('payment_status', 'paid')
      .not('access_expires_at', 'is', null)
      .gt('access_expires_at', nowIso)
      .order('access_expires_at', { ascending: false });

    if (error) {
      throw error;
    }

    const activeRow = (data ?? []).find((row) => purchaseAccessIsActive(row, now));
    return activeRow ? mapPurchaseAccessToEntitlement(activeRow) : null;
  }

  private async listFallbackPurchaseAccesses(input: { learnerUserId: string; courseIds: string[] }) {
    if (input.courseIds.length === 0) {
      return [];
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .select('id, course_id, learner_user_id, access_starts_at, access_expires_at, created_at, updated_at')
      .eq('learner_user_id', input.learnerUserId)
      .eq('payment_status', 'paid')
      .not('access_expires_at', 'is', null)
      .gt('access_expires_at', nowIso)
      .in('course_id', input.courseIds)
      .order('access_expires_at', { ascending: false });

    if (error) {
      throw error;
    }

    const firstActiveByCourseId = new Map<string, CourseEntitlement>();
    for (const row of data ?? []) {
      if (firstActiveByCourseId.has(row.course_id) || !purchaseAccessIsActive(row, now)) {
        continue;
      }

      firstActiveByCourseId.set(row.course_id, mapPurchaseAccessToEntitlement(row));
    }

    return Array.from(firstActiveByCourseId.values());
  }

  private async listLearnerPurchaseRows(learnerUserId: string) {
    const selectColumns =
      'id, course_id, learner_user_id, creator_user_id, gross_amount, currency, payment_status, payment_provider, provider_order_id, paid_at, access_starts_at, access_expires_at, pricing_plan_id, created_at, updated_at';

    const learnerResult = await this.supabase
      .from('course_purchases')
      .select(selectColumns)
      .eq('learner_user_id', learnerUserId)
      .order('created_at', { ascending: false })
      .limit(150);

    if (!learnerResult.error) {
      return (learnerResult.data ?? []) as LearnerTransactionPurchaseRow[];
    }

    const serviceResult = await this.serviceSupabase
      .from('course_purchases')
      .select(selectColumns)
      .eq('learner_user_id', learnerUserId)
      .order('created_at', { ascending: false })
      .limit(150);

    if (serviceResult.error) {
      throw serviceResult.error;
    }

    return (serviceResult.data ?? []) as LearnerTransactionPurchaseRow[];
  }

  async getPlatformSettings() {
    const { data, error } = await this.serviceSupabase
      .from('platform_settings')
      .select('*')
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return mapPlatformSettings(data);
  }

  async updatePlatformSettings(input: {
    adminUserId: string;
    platformFeePercent: number;
    minimumWithdrawalAmount: number;
    settlementHoldDays: number;
  }) {
    const { data, error } = await this.serviceSupabase
      .from('platform_settings')
      .update({
        platform_fee_percent: input.platformFeePercent,
        minimum_withdrawal_amount: input.minimumWithdrawalAmount,
        settlement_hold_days: input.settlementHoldDays,
      })
      .eq('id', 1)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapPlatformSettings(data);
  }

  async getCreatorBalanceSummary(creatorUserId: string) {
    await this.serviceSupabase.rpc('refresh_creator_balance_summary', {
      target_creator_user_id: creatorUserId,
    });

    const [summaryResult, settings] = await Promise.all([
      this.serviceSupabase
        .from('creator_balance_summaries')
        .select('*')
        .eq('creator_user_id', creatorUserId)
        .maybeSingle(),
      this.getPlatformSettings(),
    ]);

    if (summaryResult.error) {
      throw summaryResult.error;
    }

    if (!summaryResult.data) {
      return {
        creatorUserId,
        currency: settings.currency,
        totalEarnedAmount: 0,
        pendingSettlementAmount: 0,
        availableAmount: 0,
        withdrawnAmount: 0,
        pendingWithdrawalAmount: 0,
        updatedAt: new Date().toISOString(),
      } satisfies CreatorBalanceSummary;
    }

    return mapCreatorBalanceSummary(summaryResult.data);
  }

  async listCreatorWithdrawalRequests(creatorUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('withdrawal_requests')
      .select('*')
      .eq('creator_user_id', creatorUserId)
      .order('requested_at', { ascending: false });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapWithdrawal);
  }

  async listCreatorPremiumSales(creatorUserId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .select(
        'id, course_id, learner_user_id, gross_amount, platform_fee_amount, creator_net_amount, currency, payment_status, paid_at, access_starts_at, access_expires_at'
      )
      .eq('creator_user_id', creatorUserId)
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      throw error;
    }

    const rows = data ?? [];
    const [courseTitles, learnerNames] = await Promise.all([
      this.loadCourseTitles(rows.map((row) => row.course_id)),
      this.loadUserNames(rows.map((row) => row.learner_user_id)),
    ]);

    return rows.map((row) =>
      mapCreatorPremiumSale({
        purchase_id: row.id,
        course_id: row.course_id,
        course_title: courseTitles.get(row.course_id) ?? 'Course',
        learner_user_id: row.learner_user_id,
        learner_name: learnerNames.get(row.learner_user_id) ?? null,
        gross_amount: row.gross_amount,
        platform_fee_amount: row.platform_fee_amount,
        creator_net_amount: row.creator_net_amount,
        currency: row.currency,
        payment_status: row.payment_status,
        paid_at: row.paid_at,
        access_expires_at: row.access_expires_at,
        purchase_kind:
          row.access_starts_at && row.paid_at && new Date(row.access_starts_at).getTime() > new Date(row.paid_at).getTime()
            ? 'renewal'
            : 'initial',
      })
    );
  }

  async getCreatorFinanceDashboard(creatorUserId: string): Promise<CreatorFinanceDashboard> {
    const [summary, withdrawals, sales, settings] = await Promise.all([
      this.getCreatorBalanceSummary(creatorUserId),
      this.listCreatorWithdrawalRequests(creatorUserId),
      this.listCreatorPremiumSales(creatorUserId),
      this.getPlatformSettings(),
    ]);

    return {
      summary,
      withdrawals,
      sales,
      settings,
    };
  }

  async getActiveEntitlement(input: { learnerUserId: string; courseId: string }) {
    const nowIso = new Date().toISOString();
    const { data, error } = await this.serviceSupabase
      .from('course_entitlements')
      .select('*')
      .eq('learner_user_id', input.learnerUserId)
      .eq('course_id', input.courseId)
      .eq('status', 'active')
      .gt('expires_at', nowIso)
      .order('expires_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    if (data) {
      return mapCourseEntitlement(data);
    }

    return this.getFallbackPurchaseAccess(input);
  }

  async listActiveEntitlements(input: { learnerUserId: string; courseIds: string[] }) {
    if (input.courseIds.length === 0) {
      return [];
    }

    const nowIso = new Date().toISOString();
    const { data, error } = await this.serviceSupabase
      .from('course_entitlements')
      .select('*')
      .eq('learner_user_id', input.learnerUserId)
      .eq('status', 'active')
      .gt('expires_at', nowIso)
      .in('course_id', input.courseIds)
      .order('expires_at', { ascending: false });

    if (error) {
      throw error;
    }

    const firstActiveByCourseId = new Map<string, CourseEntitlement>();
    for (const row of data ?? []) {
      if (!firstActiveByCourseId.has(row.course_id)) {
        firstActiveByCourseId.set(row.course_id, mapCourseEntitlement(row));
      }
    }

    const missingCourseIds = input.courseIds.filter((courseId) => !firstActiveByCourseId.has(courseId));
    if (missingCourseIds.length > 0) {
      const fallbackEntitlements = await this.listFallbackPurchaseAccesses({
        learnerUserId: input.learnerUserId,
        courseIds: missingCourseIds,
      });

      for (const entitlement of fallbackEntitlements) {
        if (!firstActiveByCourseId.has(entitlement.courseId)) {
          firstActiveByCourseId.set(entitlement.courseId, entitlement);
        }
      }
    }

    return Array.from(firstActiveByCourseId.values());
  }

  async listCoursePricingPlans(courseId: string): Promise<CoursePricingPlan[]> {
    const { data, error } = await this.serviceSupabase
      .from('course_pricing_plans')
      .select('*')
      .eq('course_id', courseId)
      .eq('is_active', true)
      .order('position', { ascending: true });

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapCoursePricingPlan);
  }

  async getCoursePricingPlanById(planId: string): Promise<CoursePricingPlan | null> {
    const { data, error } = await this.serviceSupabase
      .from('course_pricing_plans')
      .select('*')
      .eq('id', planId)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCoursePricingPlan(data) : null;
  }

  async listLearnerPremiumTransactions(learnerUserId: string): Promise<LearnerPremiumTransaction[]> {
    const rows = await this.listLearnerPurchaseRows(learnerUserId);
    const [courseMeta, creatorNames] = await Promise.all([
      this.loadCourseMeta(rows.map((row) => row.course_id)),
      this.loadUserNames(rows.map((row) => row.creator_user_id)),
    ]);

    return rows.map((row) => {
      const course = courseMeta.get(row.course_id);
      const paymentProvider =
        row.payment_provider === 'sandbox' || row.payment_provider === 'razorpay'
          ? row.payment_provider
          : null;

      return {
        purchaseId: row.id,
        courseId: row.course_id,
        courseTitle: course?.title ?? 'Course',
        courseImageUrl: course?.imageUrl ?? null,
        creatorUserId: row.creator_user_id,
        creatorName: creatorNames.get(row.creator_user_id) ?? null,
        grossAmount: Number(row.gross_amount),
        currency: row.currency,
        paymentStatus: row.payment_status,
        paymentProvider,
        providerOrderId: row.provider_order_id,
        paidAt: row.paid_at,
        accessExpiresAt: row.access_expires_at,
        pricingPlanId: row.pricing_plan_id,
        createdAt: row.created_at,
        purchaseKind:
          row.access_starts_at && row.paid_at && new Date(row.access_starts_at).getTime() > new Date(row.paid_at).getTime()
            ? 'renewal'
            : 'initial',
        canResumePayment: row.payment_status === 'pending',
      };
    });
  }

  async getCoursePurchaseById(purchaseId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .select('*')
      .eq('id', purchaseId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCoursePurchase(data) : null;
  }

  async getCoursePurchaseByProviderOrderId(providerOrderId: string) {
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .select('*')
      .eq('provider_order_id', providerOrderId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCoursePurchase(data) : null;
  }

  async createPendingPremiumPurchase(input: {
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
  }) {
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .insert({
        id: input.purchaseId,
        course_id: input.courseId,
        learner_user_id: input.learnerUserId,
        creator_user_id: input.creatorUserId,
        purchased_access_days: input.purchasedAccessDays,
        pricing_plan_id: input.pricingPlanId ?? null,
        gross_amount: input.grossAmount,
        platform_fee_amount: input.platformFeeAmount,
        creator_net_amount: input.creatorNetAmount,
        currency: input.currency,
        payment_status: 'pending',
        payment_provider: input.provider,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCoursePurchase(data);
  }

  async attachPurchaseProviderOrderId(input: {
    purchaseId: string;
    provider: PaymentProvider;
    providerOrderId: string;
  }) {
    const { data, error } = await this.serviceSupabase
      .from('course_purchases')
      .update({
        payment_provider: input.provider,
        provider_order_id: input.providerOrderId,
      })
      .eq('id', input.purchaseId)
      .eq('payment_status', 'pending')
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCoursePurchase(data);
  }

  async finalizePremiumPurchase(input: {
    purchaseId: string;
    providerPaymentId: string;
    providerSignature: string | null;
    paymentStatus: 'paid';
  }): Promise<PremiumPurchaseFinalization> {
    const { data, error } = await this.serviceSupabase.rpc('finalize_premium_course_purchase', {
      p_purchase_id: input.purchaseId,
      p_provider_payment_id: input.providerPaymentId,
      p_provider_signature: input.providerSignature,
      p_paid_at: new Date().toISOString(),
    });

    if (error) {
      throw error;
    }

    const row = data?.[0] as
      | {
          purchase_id: string;
          entitlement_id: string;
          purchase_kind: 'initial' | 'renewal';
        }
      | undefined;

    if (!row) {
      throw new Error('Premium purchase could not be finalized.');
    }

    const [purchaseResult, entitlementResult] = await Promise.all([
      this.serviceSupabase.from('course_purchases').select('*').eq('id', row.purchase_id).single(),
      this.serviceSupabase.from('course_entitlements').select('*').eq('id', row.entitlement_id).single(),
    ]);

    if (purchaseResult.error) {
      throw purchaseResult.error;
    }

    if (entitlementResult.error) {
      throw entitlementResult.error;
    }

    return {
      purchase: mapCoursePurchase(purchaseResult.data),
      entitlement: mapCourseEntitlement(entitlementResult.data),
      settlement: {
        grossAmount: Number(purchaseResult.data.gross_amount),
        platformFeeAmount: Number(purchaseResult.data.platform_fee_amount),
        creatorNetAmount: Number(purchaseResult.data.creator_net_amount),
        currency: purchaseResult.data.currency,
      },
      purchaseKind: row.purchase_kind,
    };
  }

  async createWithdrawalRequest(input: {
    creatorUserId: string;
    amount: number;
    currency: string;
    payoutMethodSnapshot: string;
  }) {
    const { data, error } = await this.serviceSupabase.rpc('create_creator_withdrawal_request', {
      p_creator_user_id: input.creatorUserId,
      p_amount: input.amount,
      p_currency: input.currency,
      p_payout_method_snapshot: input.payoutMethodSnapshot,
    });

    if (error) {
      throw error;
    }

    const row = data?.[0];
    if (!row) {
      throw new Error('Withdrawal request could not be created.');
    }

    return mapWithdrawal(row);
  }

  async getWithdrawalRequestById(withdrawalRequestId: string) {
    const { data, error } = await this.serviceSupabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', withdrawalRequestId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapWithdrawal(data) : null;
  }

  async finalizeWithdrawalFromPayout(input: {
    withdrawalRequestId: string;
    status: 'paid' | 'rejected';
  }) {
    const { data: current, error: currentError } = await this.serviceSupabase
      .from('withdrawal_requests')
      .select('*')
      .eq('id', input.withdrawalRequestId)
      .single();

    if (currentError) {
      throw currentError;
    }

    if (current.status === input.status) {
      return mapWithdrawal(current);
    }

    if (current.status === 'paid' || current.status === 'rejected') {
      return mapWithdrawal(current);
    }

    const { data: updated, error: updateError } = await this.serviceSupabase
      .from('withdrawal_requests')
      .update({
        status: input.status,
        processed_at: new Date().toISOString(),
      })
      .eq('id', input.withdrawalRequestId)
      .select('*')
      .single();

    if (updateError) {
      throw updateError;
    }

    if (input.status === 'paid') {
      const { data: existingLedgerEntry, error: existingLedgerError } = await this.serviceSupabase
        .from('creator_balance_ledger')
        .select('id')
        .eq('reference_type', 'withdrawal_request')
        .eq('reference_id', input.withdrawalRequestId)
        .eq('entry_type', 'withdrawal_paid')
        .maybeSingle();

      if (existingLedgerError) {
        throw existingLedgerError;
      }

      if (!existingLedgerEntry) {
        const { error: ledgerError } = await this.serviceSupabase
          .from('creator_balance_ledger')
          .upsert(
            {
              creator_user_id: updated.creator_user_id,
              entry_type: 'withdrawal_paid',
              amount: -Number(updated.amount),
              currency: updated.currency,
              reference_type: 'withdrawal_request',
              reference_id: updated.id,
            },
            { onConflict: 'reference_type,reference_id,entry_type', ignoreDuplicates: true }
          );

        if (ledgerError) {
          throw ledgerError;
        }
      }
    }

    await this.serviceSupabase.rpc('refresh_creator_balance_summary', {
      target_creator_user_id: updated.creator_user_id,
    });

    return mapWithdrawal(updated);
  }

  async updateWithdrawalStatus(input: {
    adminUserId: string;
    withdrawalRequestId: string;
    status: 'paid' | 'rejected';
  }) {
    const { data, error } = await this.serviceSupabase.rpc('update_withdrawal_request_status', {
      p_admin_user_id: input.adminUserId,
      p_withdrawal_request_id: input.withdrawalRequestId,
      p_status: input.status,
    });

    if (error) {
      throw error;
    }

    const row = data?.[0];
    if (!row) {
      throw new Error('Withdrawal request could not be updated.');
    }

    return mapWithdrawal(row);
  }

  private async fetchLedgerPurchaseRowsForAdmin(limit = 100) {
    const purchasesResult = await this.serviceSupabase
      .from('course_purchases')
      .select(
        'id, course_id, learner_user_id, creator_user_id, gross_amount, platform_fee_amount, creator_net_amount, currency, payment_status, payment_provider, paid_at, access_starts_at, access_expires_at'
      )
      .order('created_at', { ascending: false })
      .limit(limit);

    if (purchasesResult.error) {
      throw purchasesResult.error;
    }

    return purchasesResult.data ?? [];
  }

  private async mapPurchaseRowsToAdminTransactions(
    purchaseRows: Awaited<ReturnType<SupabaseFinanceRepository['fetchLedgerPurchaseRowsForAdmin']>>
  ): Promise<AdminFinanceTransaction[]> {
    if (purchaseRows.length === 0) {
      return [];
    }

    const [courseTitles, learnerNames, creatorNames] = await Promise.all([
      this.loadCourseTitles(purchaseRows.map((row) => row.course_id)),
      this.loadUserNames(purchaseRows.map((row) => row.learner_user_id)),
      this.loadUserNames(purchaseRows.map((row) => row.creator_user_id)),
    ]);

    return purchaseRows.map((row) => ({
      purchaseId: row.id,
      learnerUserId: row.learner_user_id,
      learnerName: learnerNames.get(row.learner_user_id) ?? null,
      creatorUserId: row.creator_user_id,
      creatorName: creatorNames.get(row.creator_user_id) ?? null,
      courseId: row.course_id,
      courseTitle: courseTitles.get(row.course_id) ?? 'Course',
      grossAmount: Number(row.gross_amount),
      platformFeeAmount: Number(row.platform_fee_amount),
      creatorNetAmount: Number(row.creator_net_amount),
      currency: row.currency,
      paymentStatus: row.payment_status,
      paymentProvider:
        row.payment_provider === 'sandbox' || row.payment_provider === 'razorpay'
          ? row.payment_provider
          : null,
      paidAt: row.paid_at,
      entitlementExpiresAt: row.access_expires_at,
      purchaseKind:
        row.access_starts_at && row.paid_at && new Date(row.access_starts_at).getTime() > new Date(row.paid_at).getTime()
          ? 'renewal'
          : 'initial',
    }));
  }

  async listAdminFinanceTransactions(): Promise<AdminFinanceTransaction[]> {
    const purchaseRows = await this.fetchLedgerPurchaseRowsForAdmin();
    return this.mapPurchaseRowsToAdminTransactions(purchaseRows);
  }

  async getAdminCreatorPayoutsData(): Promise<{
    settings: PlatformSettings;
    creatorBalances: AdminCreatorBalanceListItem[];
    withdrawals: AdminWithdrawalQueueItem[];
  }> {
    const [settings, summariesResult, withdrawalsResult] = await Promise.all([
      this.getPlatformSettings(),
      this.serviceSupabase
        .from('creator_balance_summaries')
        .select('*')
        .order('available_amount', { ascending: false }),
      this.serviceSupabase
        .from('withdrawal_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(100),
    ]);

    if (summariesResult.error) {
      throw summariesResult.error;
    }
    if (withdrawalsResult.error) {
      throw withdrawalsResult.error;
    }

    const summaryRows = summariesResult.data ?? [];
    const withdrawalRows = withdrawalsResult.data ?? [];
    const creatorNames = await this.loadUserNames([
      ...summaryRows.map((row) => row.creator_user_id),
      ...withdrawalRows.map((row) => row.creator_user_id),
    ]);

    const creatorBalances: AdminCreatorBalanceListItem[] = summaryRows.map((row) => ({
      ...mapCreatorBalanceSummary(row),
      creatorName: creatorNames.get(row.creator_user_id) ?? null,
    }));

    const withdrawals: AdminWithdrawalQueueItem[] = withdrawalRows.map((row) => ({
      ...mapWithdrawal(row),
      creatorName: creatorNames.get(row.creator_user_id) ?? null,
    }));

    return { settings, creatorBalances, withdrawals };
  }

  async getAdminFinanceDashboard(): Promise<AdminFinanceDashboard> {
    const [settings, purchaseRows, summariesResult, withdrawalsResult, entitlementsResult] = await Promise.all([
      this.getPlatformSettings(),
      this.fetchLedgerPurchaseRowsForAdmin(),
      this.serviceSupabase.from('creator_balance_summaries').select('*'),
      this.serviceSupabase
        .from('withdrawal_requests')
        .select('*')
        .order('requested_at', { ascending: false })
        .limit(100),
      this.serviceSupabase.from('course_entitlements').select('status'),
    ]);

    if (summariesResult.error) {
      throw summariesResult.error;
    }
    if (withdrawalsResult.error) {
      throw withdrawalsResult.error;
    }
    if (entitlementsResult.error) {
      throw entitlementsResult.error;
    }

    const withdrawalRows = withdrawalsResult.data ?? [];
    const creatorNames = await this.loadUserNames([
      ...purchaseRows.map((row) => row.creator_user_id),
      ...withdrawalRows.map((row) => row.creator_user_id),
    ]);

    const paidRows = purchaseRows.filter((row) => row.payment_status === 'paid');
    const summary: AdminFinanceSummary = {
      totalGmv: paidRows.reduce((sum, row) => sum + Number(row.gross_amount), 0),
      totalPlatformRevenue: paidRows.reduce((sum, row) => sum + Number(row.platform_fee_amount), 0),
      totalCreatorNetCredited: paidRows.reduce((sum, row) => sum + Number(row.creator_net_amount), 0),
      totalPendingSettlement: (summariesResult.data ?? []).reduce(
        (sum, row) => sum + Number(row.pending_settlement_amount),
        0
      ),
      totalAvailableCreatorBalances: (summariesResult.data ?? []).reduce(
        (sum, row) => sum + Number(row.available_amount),
        0
      ),
      totalPendingWithdrawals: withdrawalRows
        .filter((row) => row.status === 'pending' || row.status === 'approved')
        .reduce((sum, row) => sum + Number(row.amount), 0),
      totalPaidWithdrawals: withdrawalRows
        .filter((row) => row.status === 'paid')
        .reduce((sum, row) => sum + Number(row.amount), 0),
      activePremiumEntitlementsCount: (entitlementsResult.data ?? []).filter(
        (row) => row.status === 'active'
      ).length,
      expiredPremiumEntitlementsCount: (entitlementsResult.data ?? []).filter(
        (row) => row.status === 'expired' || row.status === 'revoked'
      ).length,
    };

    const transactions = await this.mapPurchaseRowsToAdminTransactions(purchaseRows);

    const withdrawals: AdminFinanceDashboard['withdrawals'] = withdrawalRows.map((row) => ({
      ...mapWithdrawal(row),
      creatorName: creatorNames.get(row.creator_user_id) ?? null,
    }));

    return {
      settings,
      summary,
      transactions,
      withdrawals,
    };
  }


  async getCreatorPayoutProfile(creatorUserId: string): Promise<CreatorPayoutProfile | null> {
    const { data, error } = await (this.serviceSupabase as any)
      .from('creator_payout_profiles')
      .select('*')
      .eq('creator_user_id', creatorUserId)
      .maybeSingle();

    if (error) {
      throw error;
    }

    return data ? mapCreatorPayoutProfileRow(data) : null;
  }

  async saveCreatorPayoutProfile(input: {
    creatorUserId: string;
    payoutMethodSnapshot: string;
  }): Promise<CreatorPayoutProfile> {
    const { data, error } = await (this.serviceSupabase as any)
      .from('creator_payout_profiles')
      .upsert(
        {
          creator_user_id: input.creatorUserId,
          payout_method_snapshot: input.payoutMethodSnapshot,
          masked_payout_label: normalizePayoutLabel(input.payoutMethodSnapshot),
          is_verified: true,
          is_active: true,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'creator_user_id' }
      )
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapCreatorPayoutProfileRow(data);
  }

  async listBulkPayoutCandidates(): Promise<BulkPayoutCandidate[]> {
    const [summariesResult, profilesResult] = await Promise.all([
      this.serviceSupabase.from('creator_balance_summaries').select('*').order('available_amount', { ascending: false }),
      (this.serviceSupabase as any).from('creator_payout_profiles').select('*').eq('is_active', true),
    ]);

    if (summariesResult.error) {
      throw summariesResult.error;
    }
    if (profilesResult.error) {
      throw profilesResult.error;
    }

    const summaryRows = summariesResult.data ?? [];
    const profileRows = (profilesResult.data ?? []) as any[];
    const profileMap = new Map<string, CreatorPayoutProfile>(
      profileRows.map((row: any) => [String(row.creator_user_id), mapCreatorPayoutProfileRow(row)])
    );
    const creatorNames = await this.loadUserNames(summaryRows.map((row) => row.creator_user_id));
    const settings = await this.getPlatformSettings();

    return summaryRows.map((row) => {
      const profile: CreatorPayoutProfile | null = profileMap.get(row.creator_user_id) ?? null;
      let reason: string | null = null;
      if (Number(row.available_amount) < settings.minimumWithdrawalAmount) {
        reason = `Below minimum withdrawal of ${settings.minimumWithdrawalAmount} ${settings.currency}.`;
      } else if (!profile) {
        reason = 'No payout destination saved.';
      } else if (!profile.isVerified || !profile.isActive) {
        reason = 'Saved payout destination is inactive or unverified.';
      }

      return {
        creatorUserId: row.creator_user_id,
        creatorName: creatorNames.get(row.creator_user_id) ?? null,
        creatorEmail: null,
        availableAmount: Number(row.available_amount),
        currency: row.currency,
        payoutProfile: profile,
        eligible: reason === null && Number(row.available_amount) > 0,
        reason,
      };
    });
  }

  async listBulkPayoutBatches(limit = 20): Promise<BulkPayoutBatch[]> {
    const { data, error } = await (this.serviceSupabase as any)
      .from('creator_payout_batches')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      throw error;
    }

    return (data ?? []).map(mapBulkPayoutBatchRow);
  }

  async createBulkPayoutBatch(input: {
    mode: 'manual_run' | 'scheduled_run';
    triggeredByAdminUserId: string | null;
    currency: string;
    minimumThresholdSnapshot: number;
    totalCreatorsSelected: number;
    totalAmountSelected: number;
    scheduledFor?: string | null;
    notes?: string | null;
  }): Promise<BulkPayoutBatch> {
    const { data, error } = await (this.serviceSupabase as any)
      .from('creator_payout_batches')
      .insert({
        mode: input.mode,
        status: 'draft',
        triggered_by_admin_user_id: input.triggeredByAdminUserId,
        scheduled_for: input.scheduledFor ?? null,
        currency: input.currency,
        minimum_threshold_snapshot: input.minimumThresholdSnapshot,
        total_creators_selected: input.totalCreatorsSelected,
        total_amount_selected: input.totalAmountSelected,
        total_amount_processed: 0,
        notes: input.notes ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapBulkPayoutBatchRow(data);
  }

  async updateBulkPayoutBatch(input: {
    batchId: string;
    status: 'running' | 'completed' | 'partially_failed' | 'failed';
    totalAmountProcessed?: number;
    finishedAt?: string | null;
    startedAt?: string | null;
    notes?: string | null;
  }): Promise<BulkPayoutBatch> {
    const payload: Record<string, unknown> = {
      status: input.status,
      updated_at: new Date().toISOString(),
    };
    if (input.totalAmountProcessed !== undefined) {
      payload.total_amount_processed = input.totalAmountProcessed;
    }
    if (input.finishedAt !== undefined) {
      payload.finished_at = input.finishedAt;
    }
    if (input.startedAt !== undefined) {
      payload.started_at = input.startedAt;
    }
    if (input.notes !== undefined) {
      payload.notes = input.notes;
    }

    const { data, error } = await (this.serviceSupabase as any)
      .from('creator_payout_batches')
      .update(payload)
      .eq('id', input.batchId)
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapBulkPayoutBatchRow(data);
  }

  async createBulkPayoutBatchItem(input: {
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
  }): Promise<BulkPayoutBatchItem> {
    const { data, error } = await (this.serviceSupabase as any)
      .from('creator_payout_batch_items')
      .insert({
        batch_id: input.batchId,
        creator_user_id: input.creatorUserId,
        creator_name: input.creatorName ?? null,
        withdrawal_request_id: input.withdrawalRequestId ?? null,
        eligible_amount: input.eligibleAmount,
        currency: input.currency,
        status: input.status,
        skip_reason: input.skipReason ?? null,
        failure_reason: input.failureReason ?? null,
        provider_payout_id: input.providerPayoutId ?? null,
        idempotency_key: input.idempotencyKey ?? null,
      })
      .select('*')
      .single();

    if (error) {
      throw error;
    }

    return mapBulkPayoutBatchItemRow(data);
  }

  private async loadCourseTitles(courseIds: string[]) {
    const courseMeta = await this.loadCourseMeta(courseIds);
    return new Map(Array.from(courseMeta.entries()).map(([courseId, course]) => [courseId, course.title]));
  }

  private async loadCourseMeta(courseIds: string[]) {
    const uniqueCourseIds = [...new Set(courseIds.filter(Boolean))];
    if (uniqueCourseIds.length === 0) {
      return new Map<string, { title: string; imageUrl: string | null }>();
    }

    const { data, error } = await this.serviceSupabase
      .from('courses')
      .select('id, title, image_url')
      .in('id', uniqueCourseIds);

    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.id, { title: row.title, imageUrl: row.image_url }]));
  }

  private async loadUserNames(userIds: string[]) {
    const uniqueUserIds = [...new Set(userIds.filter(Boolean))];
    if (uniqueUserIds.length === 0) {
      return new Map<string, string | null>();
    }

    const { data, error } = await this.serviceSupabase
      .from('user_profiles')
      .select('user_id, full_name')
      .in('user_id', uniqueUserIds);

    if (error) {
      throw error;
    }

    return new Map((data ?? []).map((row) => [row.user_id, row.full_name]));
  }
}

