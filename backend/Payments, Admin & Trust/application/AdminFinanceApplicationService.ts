import { describePayoutMode, env } from '@/lib/env';
import { ApplicationError } from '@/src/application/errors';
import type { FinanceRepository, PayoutGatewayPort } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';

export class AdminFinanceApplicationService {
  constructor(
    private readonly financeRepository: FinanceRepository,
    private readonly payoutGateway: PayoutGatewayPort
  ) {}

  async getDashboard(viewer: Viewer) {
    this.assertAdmin(viewer);
    return this.financeRepository.getAdminFinanceDashboard();
  }

  async getPlatformSettingsForAdmin(viewer: Viewer) {
    this.assertAdmin(viewer);
    return this.financeRepository.getPlatformSettings();
  }

  async getCreatorPayoutsPage(viewer: Viewer) {
    this.assertAdmin(viewer);
    return this.financeRepository.getAdminCreatorPayoutsData();
  }

  async getBulkPayoutConsole(viewer: Viewer) {
    this.assertAdmin(viewer);
    const [settings, candidates, batches] = await Promise.all([
      this.financeRepository.getPlatformSettings(),
      this.financeRepository.listBulkPayoutCandidates(),
      this.financeRepository.listBulkPayoutBatches(20),
    ]);

    const eligibleCandidates = candidates.filter((candidate) => candidate.eligible);
    const skippedCandidates = candidates.filter((candidate) => !candidate.eligible);

    const nextScheduledLabel = env.enableAdminBulkPayout
      ? `${env.adminBulkPayoutDay} ${env.adminBulkPayoutTimeUtc} ${env.adminBulkPayoutTimezone}`
      : null;

    return {
      settings,
      candidates,
      eligibleCandidates,
      skippedCandidates,
      batches,
      nextScheduledLabel,
    };
  }

  async getPremiumTransactionLedger(viewer: Viewer) {
    this.assertAdmin(viewer);
    return this.financeRepository.listAdminFinanceTransactions();
  }

  async updateSettings(
    viewer: Viewer,
    input: {
      platformFeePercent: number;
      minimumWithdrawalAmount: number;
      settlementHoldDays: number;
    }
  ) {
    this.assertAdmin(viewer);
    return this.financeRepository.updatePlatformSettings({
      adminUserId: viewer.user.id,
      platformFeePercent: input.platformFeePercent,
      minimumWithdrawalAmount: input.minimumWithdrawalAmount,
      settlementHoldDays: input.settlementHoldDays,
    });
  }

  async updateWithdrawalStatus(
    viewer: Viewer,
    input: { withdrawalRequestId: string; status: 'paid' | 'rejected' }
  ) {
    this.assertAdmin(viewer);
    return this.financeRepository.updateWithdrawalStatus({
      adminUserId: viewer.user.id,
      withdrawalRequestId: input.withdrawalRequestId,
      status: input.status,
    });
  }

  async createManualWithdrawalRecord(
    viewer: Viewer,
    input: { creatorUserId: string; amount: number; payoutMethodSnapshot: string }
  ) {
    this.assertAdmin(viewer);
    if (env.enableSelfWithdrawal || env.enableAdminBulkPayout) {
      throw new ApplicationError(
        'Manual admin payout records are only available while PAYOUT_MODE=manual.',
        400
      );
    }

    if (input.amount <= 0) {
      throw new ApplicationError('Withdrawal amount must be greater than zero.');
    }

    const [summary, settings] = await Promise.all([
      this.financeRepository.getCreatorBalanceSummary(input.creatorUserId),
      this.financeRepository.getPlatformSettings(),
    ]);

    if (input.amount < settings.minimumWithdrawalAmount) {
      throw new ApplicationError(
        `Minimum withdrawal amount is ${settings.minimumWithdrawalAmount.toFixed(2)} ${settings.currency}.`
      );
    }

    if (input.amount > summary.availableAmount) {
      throw new ApplicationError("Withdrawal amount exceeds this creator's available balance.");
    }

    return this.financeRepository.createWithdrawalRequest({
      creatorUserId: input.creatorUserId,
      amount: Number(input.amount.toFixed(2)),
      currency: summary.currency,
      payoutMethodSnapshot: input.payoutMethodSnapshot,
    });
  }

  async runBulkPayoutBatch(viewer: Viewer, input?: { dryRun?: boolean; mode?: 'manual_run' | 'scheduled_run' }) {
    this.assertAdmin(viewer);
    if (!env.enableAdminBulkPayout) {
      throw new ApplicationError(
        `Bulk payout mode is disabled for this deployment. ${describePayoutMode()}`,
        400
      );
    }

    const consoleData = await this.getBulkPayoutConsole(viewer);
    const selected = consoleData.eligibleCandidates;
    const totalAmountSelected = selected.reduce((sum, candidate) => sum + candidate.availableAmount, 0);
    const dryRun = input?.dryRun ?? env.adminBulkPayoutDryRun;

    if (dryRun) {
      return {
        dryRun: true,
        selectedCount: selected.length,
        totalAmountSelected,
        currency: consoleData.settings.currency,
        selected,
        skipped: consoleData.skippedCandidates,
      } as const;
    }

    const batch = await this.financeRepository.createBulkPayoutBatch({
      mode: input?.mode ?? 'manual_run',
      triggeredByAdminUserId: viewer.user.id,
      currency: consoleData.settings.currency,
      minimumThresholdSnapshot: consoleData.settings.minimumWithdrawalAmount,
      totalCreatorsSelected: selected.length,
      totalAmountSelected: Number(totalAmountSelected.toFixed(2)),
      notes: `${selected.length} eligible creators selected under ${describePayoutMode()}`,
    });

    await this.financeRepository.updateBulkPayoutBatch({
      batchId: batch.id,
      status: 'running',
      startedAt: new Date().toISOString(),
    });

    const results: Array<{
      creatorUserId: string;
      creatorName: string | null;
      status: 'processed' | 'pending' | 'failed';
      amount: number;
      withdrawalRequestId: string | null;
      providerPayoutId: string | null;
      failureReason: string | null;
    }> = [];

    for (const candidate of selected) {
      const payoutProfile = candidate.payoutProfile;
      if (!payoutProfile || !candidate.eligible) {
        await this.financeRepository.createBulkPayoutBatchItem({
          batchId: batch.id,
          creatorUserId: candidate.creatorUserId,
          creatorName: candidate.creatorName,
          eligibleAmount: candidate.availableAmount,
          currency: candidate.currency,
          status: 'skipped',
          skipReason: candidate.reason ?? 'Creator is not eligible for this batch.',
        });
        continue;
      }

      try {
        const withdrawal = await this.financeRepository.createWithdrawalRequest({
          creatorUserId: candidate.creatorUserId,
          amount: Number(candidate.availableAmount.toFixed(2)),
          currency: candidate.currency,
          payoutMethodSnapshot: payoutProfile.payoutMethodSnapshot,
        });

        const payout = await this.payoutGateway.createCreatorPayout({
          withdrawalRequestId: withdrawal.id,
          creatorUserId: candidate.creatorUserId,
          creatorName: candidate.creatorName,
          creatorEmail: candidate.creatorEmail ?? '',
          amount: withdrawal.amount,
          currency: withdrawal.currency,
          payoutMethodSnapshot: withdrawal.payoutMethodSnapshot,
        });

        if (payout.status === 'processed') {
          await this.financeRepository.finalizeWithdrawalFromPayout({
            withdrawalRequestId: withdrawal.id,
            status: 'paid',
          });
        }

        if (payout.status === 'failed') {
          await this.financeRepository.finalizeWithdrawalFromPayout({
            withdrawalRequestId: withdrawal.id,
            status: 'rejected',
          });
        }

        await this.financeRepository.createBulkPayoutBatchItem({
          batchId: batch.id,
          creatorUserId: candidate.creatorUserId,
          creatorName: candidate.creatorName,
          withdrawalRequestId: withdrawal.id,
          eligibleAmount: candidate.availableAmount,
          currency: candidate.currency,
          status: payout.status,
          failureReason: payout.failureReason,
          providerPayoutId: payout.payoutId,
          idempotencyKey: `${batch.id}:${candidate.creatorUserId}`,
        });

        results.push({
          creatorUserId: candidate.creatorUserId,
          creatorName: candidate.creatorName,
          status: payout.status,
          amount: candidate.availableAmount,
          withdrawalRequestId: withdrawal.id,
          providerPayoutId: payout.payoutId,
          failureReason: payout.failureReason,
        });
      } catch (error) {
        const failureReason = error instanceof Error ? error.message : 'Bulk payout failed.';
        await this.financeRepository.createBulkPayoutBatchItem({
          batchId: batch.id,
          creatorUserId: candidate.creatorUserId,
          creatorName: candidate.creatorName,
          eligibleAmount: candidate.availableAmount,
          currency: candidate.currency,
          status: 'failed',
          failureReason,
          idempotencyKey: `${batch.id}:${candidate.creatorUserId}`,
        });

        results.push({
          creatorUserId: candidate.creatorUserId,
          creatorName: candidate.creatorName,
          status: 'failed',
          amount: candidate.availableAmount,
          withdrawalRequestId: null,
          providerPayoutId: null,
          failureReason,
        });
      }
    }

    const processedAmount = results
      .filter((result) => result.status === 'processed' || result.status === 'pending')
      .reduce((sum, result) => sum + result.amount, 0);
    const processedCount = results.filter((result) => result.status === 'processed').length;
    const failedCount = results.filter((result) => result.status === 'failed').length;
    const pendingCount = results.filter((result) => result.status === 'pending').length;

    const status =
      failedCount === 0
        ? 'completed'
        : processedCount > 0 || pendingCount > 0
          ? 'partially_failed'
          : 'failed';

    const finalizedBatch = await this.financeRepository.updateBulkPayoutBatch({
      batchId: batch.id,
      status,
      totalAmountProcessed: Number(processedAmount.toFixed(2)),
      finishedAt: new Date().toISOString(),
      notes: `Processed ${processedCount}, pending ${pendingCount}, failed ${failedCount}.`,
    });

    return {
      dryRun: false,
      batch: finalizedBatch,
      results,
      summary: {
        selectedCount: selected.length,
        processedCount,
        pendingCount,
        failedCount,
        totalAmountSelected: Number(totalAmountSelected.toFixed(2)),
        totalAmountProcessed: Number(processedAmount.toFixed(2)),
        currency: consoleData.settings.currency,
      },
    } as const;
  }

  private assertAdmin(viewer: Viewer) {
    if (!viewer.profile.isAdmin) {
      throw new ApplicationError('Admin access is required.', 403);
    }
  }
}


