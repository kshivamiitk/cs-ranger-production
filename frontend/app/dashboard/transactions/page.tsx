import Link from 'next/link';
import { AlertTriangle, Clock3, History, Landmark, Wallet } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { PremiumAccessButton } from '@/components/learner/PremiumAccessButton';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { StatCard } from '@/components/ui/StatCard';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { cn, formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerViewer } from '@/src/presentation/serverPage';

export default async function LearnerTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { learnerFinanceService }] = await Promise.all([
    requireServerViewer('/dashboard/transactions'),
    createServerContainer(),
  ]);
  const transactions = await learnerFinanceService.getLearnerTransactions(viewer);
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedTransactions = paginateList(transactions.items, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Transaction History"
      subtitle="Track completed premium purchases, pending checkout attempts, and access window status from one learner-focused history page."
    >
      <section className="stat-grid">
        <StatCard label="All transactions" value={String(transactions.summary.total)} icon={<History size={18} />} />
        <StatCard label="Completed" value={String(transactions.summary.completed)} icon={<Wallet size={18} />} />
        <StatCard label="Pending" value={String(transactions.summary.pending)} icon={<Clock3 size={18} />} />
        <StatCard label="Failed / cancelled" value={String(transactions.summary.failed)} icon={<AlertTriangle size={18} />} />
        <StatCard label="Expired access" value={String(transactions.summary.expiredAccess)} icon={<Landmark size={18} />} />
      </section>

      <section className="panel stack-lg">
        <div>
          <h2 className="panel-title">Learner payments</h2>
          <p className="muted">
            Pending payments remain resumable when a pending purchase exists. Completed purchases show payment and entitlement timing details.
          </p>
        </div>

        <ListPaginationControls
          pathname="/dashboard/transactions"
          searchParams={resolvedSearchParams}
          page={pagedTransactions.page}
          size={pagedTransactions.size}
          totalItems={pagedTransactions.totalItems}
          totalPages={pagedTransactions.totalPages}
          startIndex={pagedTransactions.startIndex}
          endIndex={pagedTransactions.endIndex}
          noun="transactions"
        />

        {transactions.items.length === 0 ? (
          <div className="empty-state">
            No premium transactions yet. Open the catalog and unlock a premium course when you are ready.
          </div>
        ) : (
          <div className="stack">
            {pagedTransactions.items.map((transaction) => (
              <article key={transaction.purchaseId} className="card learner-transaction-card">
                <div className="learner-transaction-header">
                  <div className="stack" style={{ gap: 8 }}>
                    <div className="inline premium-badge-row">
                      <span className={cn('transaction-status-chip', `is-${transaction.paymentTone}`)}>
                        {transaction.paymentLabel}
                      </span>
                      <span className="studio-badge studio-badge-muted">{transaction.purchaseKind}</span>
                      {transaction.entitlementLabel ? (
                        <span
                          className={cn(
                            'studio-badge',
                            transaction.entitlementLabel.includes('expired')
                              ? 'studio-badge-warning'
                              : 'studio-badge-success'
                          )}
                        >
                          {transaction.entitlementLabel}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="panel-title" style={{ margin: 0 }}>
                      {transaction.courseTitle}
                    </h3>
                    <p className="muted" style={{ margin: 0 }}>
                      Purchase {transaction.purchaseId.slice(0, 8)} · Created {formatDateTimeLabel(transaction.createdAt)}
                      {transaction.paidAt ? ` · Paid ${formatDateTimeLabel(transaction.paidAt)}` : ''}
                      {transaction.accessExpiresAt ? ` · Access until ${formatDateTimeLabel(transaction.accessExpiresAt)}` : ''}
                    </p>
                  </div>
                  <div className="stack learner-transaction-amount" style={{ gap: 4 }}>
                    <strong>{formatCurrency(transaction.grossAmount, transaction.currency)}</strong>
                    <span className="muted">{transaction.paymentProvider ?? 'manual'}</span>
                  </div>
                </div>

                <div className="learner-transaction-footer">
                  <div className="muted learner-transaction-meta">
                    {transaction.canContinuePayment
                      ? 'This payment is still pending. Continue checkout to complete premium access.'
                      : transaction.paymentStatus === 'paid'
                        ? transaction.accessExpiresAt
                          ? `Payment completed successfully. Premium access stays active until ${formatDateTimeLabel(transaction.accessExpiresAt)}.`
                          : 'Payment completed successfully.'
                        : transaction.paymentStatus === 'refunded'
                          ? 'This transaction was refunded.'
                          : 'This payment did not complete successfully.'}
                  </div>
                  <div className="inline">
                    {transaction.canContinuePayment ? (
                      <PremiumAccessButton
                        courseId={transaction.courseId}
                        resumePurchaseId={transaction.purchaseId}
                        label={transaction.continuePaymentLabel ?? 'Continue payment'}
                        className="button-secondary"
                      />
                    ) : null}
                    <Link href={`/courses/${transaction.courseId}`} className="button button-ghost">
                      Open course
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}


