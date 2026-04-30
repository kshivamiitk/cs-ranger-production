import type { FinanceRepository } from '@/src/domain/ports';
import type { LearnerPremiumTransaction, PaymentStatus, Viewer } from '@/src/domain/models';

type TransactionTone = 'success' | 'pending' | 'danger' | 'muted';

export interface LearnerTransactionListItem extends LearnerPremiumTransaction {
  paymentLabel: string;
  paymentTone: TransactionTone;
  entitlementLabel: string | null;
  canContinuePayment: boolean;
  continuePaymentLabel: string | null;
}

export interface LearnerTransactionsViewModel {
  items: LearnerTransactionListItem[];
  summary: {
    total: number;
    completed: number;
    pending: number;
    failed: number;
    expiredAccess: number;
  };
}

export class LearnerFinanceApplicationService {
  constructor(private readonly financeRepository: FinanceRepository) {}

  async getLearnerTransactions(viewer: Viewer): Promise<LearnerTransactionsViewModel> {
    const transactions = await this.financeRepository.listLearnerPremiumTransactions(viewer.user.id);
    const nowMs = Date.now();

    const items = transactions.map((transaction) => {
      const paymentMeta = toPaymentMeta(transaction.paymentStatus);
      const accessExpiryMs = transaction.accessExpiresAt ? new Date(transaction.accessExpiresAt).getTime() : null;
      const accessExpired = accessExpiryMs !== null && Number.isFinite(accessExpiryMs) && accessExpiryMs < nowMs;

      return {
        ...transaction,
        paymentLabel: paymentMeta.label,
        paymentTone: paymentMeta.tone,
        entitlementLabel: transaction.accessExpiresAt
          ? accessExpired
            ? 'Premium access expired'
            : 'Premium access active'
          : null,
        canContinuePayment: transaction.paymentStatus === 'pending' && transaction.canResumePayment,
        continuePaymentLabel: transaction.paymentStatus === 'pending' && transaction.canResumePayment
          ? 'Continue payment'
          : null,
      } satisfies LearnerTransactionListItem;
    });

    return {
      items,
      summary: {
        total: items.length,
        completed: items.filter((item) => item.paymentStatus === 'paid').length,
        pending: items.filter((item) => item.paymentStatus === 'pending').length,
        failed: items.filter((item) => item.paymentStatus === 'failed' || item.paymentStatus === 'cancelled').length,
        expiredAccess: items.filter((item) => {
          if (!item.accessExpiresAt) {
            return false;
          }

          return new Date(item.accessExpiresAt).getTime() < nowMs;
        }).length,
      },
    };
  }
}

function toPaymentMeta(status: PaymentStatus): { label: string; tone: TransactionTone } {
  if (status === 'paid') {
    return {
      label: 'Completed',
      tone: 'success',
    };
  }

  if (status === 'pending') {
    return {
      label: 'Pending',
      tone: 'pending',
    };
  }

  if (status === 'failed' || status === 'cancelled') {
    return {
      label: status === 'failed' ? 'Failed' : 'Cancelled',
      tone: 'danger',
    };
  }

  return {
    label: 'Refunded',
    tone: 'muted',
  };
}


