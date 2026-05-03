import { describePayoutMode, env } from '@/lib/env';
import { ApplicationError } from '@/src/application/errors';
import type { FinanceRepository, PayoutGatewayPort } from '@/src/domain/ports';
import type { Viewer } from '@/src/domain/models';
import { createProviderWebhookEventKey } from '@/shared/scaling/idempotency';

export class CreatorFinanceApplicationService {
  constructor(
    private readonly financeRepository: FinanceRepository,
    private readonly payoutGateway: PayoutGatewayPort
  ) {}

  async getCreatorDashboard(viewer: Viewer) {
    this.assertCreator(viewer);
    return this.financeRepository.getCreatorFinanceDashboard(viewer.user.id);
  }

  async getPayoutProfile(viewer: Viewer) {
    this.assertCreator(viewer);
    return this.financeRepository.getCreatorPayoutProfile(viewer.user.id);
  }

  async savePayoutProfile(viewer: Viewer, input: { payoutMethodSnapshot: string }) {
    this.assertCreator(viewer);
    const snapshot = input.payoutMethodSnapshot.trim();
    if (snapshot.length < 5) {
      throw new ApplicationError('Enter a valid payout destination snapshot (UPI or bank JSON).');
    }

    return this.financeRepository.saveCreatorPayoutProfile({
      creatorUserId: viewer.user.id,
      payoutMethodSnapshot: snapshot,
    });
  }

  async createWithdrawalRequest(
    viewer: Viewer,
    input: { amount: number; payoutMethodSnapshot: string }
  ) {
    this.assertCreator(viewer);
    if (!env.enableSelfWithdrawal) {
      throw new ApplicationError(
        `Self-service withdrawals are disabled for this deployment. ${describePayoutMode()}`,
        403
      );
    }
    const [summary, settings, payoutProfile] = await Promise.all([
      this.financeRepository.getCreatorBalanceSummary(viewer.user.id),
      this.financeRepository.getPlatformSettings(),
      this.financeRepository.getCreatorPayoutProfile(viewer.user.id),
    ]);

    if (input.amount <= 0) {
      throw new ApplicationError('Withdrawal amount must be greater than zero.');
    }

    if (input.amount < settings.minimumWithdrawalAmount) {
      throw new ApplicationError(
        `Minimum withdrawal amount is ${settings.minimumWithdrawalAmount.toFixed(2)} ${settings.currency}.`
      );
    }

    if (input.amount > summary.availableAmount) {
      throw new ApplicationError('Withdrawal amount exceeds available balance.');
    }

    const payoutMethodSnapshot = input.payoutMethodSnapshot.trim() || payoutProfile?.payoutMethodSnapshot || '';
    if (payoutMethodSnapshot.length < 5) {
      throw new ApplicationError('Save your payout destination first, then retry the withdrawal.');
    }

    const created = await this.financeRepository.createWithdrawalRequest({
      creatorUserId: viewer.user.id,
      amount: Number(input.amount.toFixed(2)),
      currency: summary.currency,
      payoutMethodSnapshot,
    });

    let payout: Awaited<ReturnType<PayoutGatewayPort['createCreatorPayout']>>;
    try {
      payout = await this.payoutGateway.createCreatorPayout({
        withdrawalRequestId: created.id,
        creatorUserId: viewer.user.id,
        creatorName: viewer.profile.fullName,
        creatorEmail: viewer.user.email,
        amount: created.amount,
        currency: created.currency,
        payoutMethodSnapshot: created.payoutMethodSnapshot,
      });
    } catch (error) {
      await this.financeRepository
        .finalizeWithdrawalFromPayout({
          withdrawalRequestId: created.id,
          status: 'rejected',
        })
        .catch(() => undefined);

      if (error instanceof ApplicationError) {
        throw error;
      }

      throw new ApplicationError(
        error instanceof Error
          ? error.message
          : 'Payout initiation failed. Withdrawal was not completed.'
      );
    }

    if (payout.status === 'processed') {
      return this.financeRepository.finalizeWithdrawalFromPayout({
        withdrawalRequestId: created.id,
        status: 'paid',
      });
    }

    if (payout.status === 'failed') {
      await this.financeRepository.finalizeWithdrawalFromPayout({
        withdrawalRequestId: created.id,
        status: 'rejected',
      });
      throw new ApplicationError(
        payout.failureReason || 'Payout failed at provider. Withdrawal was not completed.'
      );
    }

    return created;
  }

  async handlePayoutWebhook(input: {
    provider: 'razorpayx';
    rawBody: string;
    signature: string | null;
  }) {
    const event = await this.payoutGateway.parseCreatorPayoutWebhook(input);
    if (!event) {
      return {
        ignored: true,
        reason: 'Event did not contain payout details.',
      } as const;
    }

    if (!event.withdrawalRequestId) {
      return {
        ignored: true,
        reason: 'Payout event did not include a withdrawal reference id.',
      } as const;
    }

    const withdrawal = await this.financeRepository.getWithdrawalRequestById(event.withdrawalRequestId);
    if (!withdrawal) {
      return {
        ignored: true,
        reason: 'No withdrawal matched the payout reference id.',
      } as const;
    }

    const eventKey = createProviderWebhookEventKey({
      provider: event.provider,
      eventType: event.eventType,
      payoutId: event.payoutId,
      fallbackSignature: input.signature,
    });

    if (withdrawal.status === 'paid' || withdrawal.status === 'rejected') {
      const duplicateProcessed = withdrawal.status === 'paid' && event.status === 'processed';
      const duplicateRejected = withdrawal.status === 'rejected' && event.status === 'failed';
      if (duplicateProcessed || duplicateRejected) {
        return {
          ignored: true,
          reason: 'Duplicate payout webhook ignored.',
          eventType: event.eventType,
          eventKey,
        } as const;
      }

      throw new ApplicationError('Payout webhook status conflicts with finalized withdrawal.', 409);
    }

    if (event.status === 'processed') {
      const finalized = await this.financeRepository.finalizeWithdrawalFromPayout({
        withdrawalRequestId: withdrawal.id,
        status: 'paid',
      });
      return {
        ignored: false,
        withdrawal: finalized,
        eventType: event.eventType,
      } as const;
    }

    if (event.status === 'failed') {
      const finalized = await this.financeRepository.finalizeWithdrawalFromPayout({
        withdrawalRequestId: withdrawal.id,
        status: 'rejected',
      });
      return {
        ignored: false,
        withdrawal: finalized,
        eventType: event.eventType,
      } as const;
    }

    return {
      ignored: true,
      reason: 'Payout is still pending at provider.',
      eventType: event.eventType,
    } as const;
  }

  private assertCreator(viewer: Viewer) {
    if (viewer.profile.primaryRole !== 'creator') {
      throw new ApplicationError('Creator access is required.', 403);
    }
  }
}

