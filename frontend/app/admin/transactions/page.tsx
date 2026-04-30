import { AppShell } from '@/components/app-shell/AppShell';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { adminFinanceService }] = await Promise.all([
    requireServerAdmin('/admin/transactions'),
    createServerContainer(),
  ]);
  const transactions = await adminFinanceService.getPremiumTransactionLedger(viewer);
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedTransactions = paginateList(transactions, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Premium transactions"
      subtitle="Recent premium purchases: gross, platform share, creator net, and entitlement expiry. Use page-size controls to inspect the ledger like a proper ops table."
    >
      <section className="panel stack">
        <ListPaginationControls
          pathname="/admin/transactions"
          searchParams={resolvedSearchParams}
          page={pagedTransactions.page}
          size={pagedTransactions.size}
          totalItems={pagedTransactions.totalItems}
          totalPages={pagedTransactions.totalPages}
          startIndex={pagedTransactions.startIndex}
          endIndex={pagedTransactions.endIndex}
          noun="transactions"
        />
        {transactions.length === 0 ? (
          <div className="empty-state">No premium transactions recorded yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Course</th>
                  <th>Learner</th>
                  <th>Creator</th>
                  <th>Gross</th>
                  <th>Platform</th>
                  <th>Net</th>
                  <th>Status</th>
                  <th>Provider</th>
                  <th>Kind</th>
                  <th>Expiry</th>
                </tr>
              </thead>
              <tbody>
                {pagedTransactions.items.map((transaction) => (
                  <tr key={transaction.purchaseId}>
                    <td>
                      <div className="stack" style={{ gap: 4 }}>
                        <strong>{transaction.courseTitle}</strong>
                        <span className="muted">{transaction.purchaseId.slice(0, 8)}</span>
                      </div>
                    </td>
                    <td>{transaction.learnerName ?? transaction.learnerUserId}</td>
                    <td>{transaction.creatorName ?? transaction.creatorUserId}</td>
                    <td>{formatCurrency(transaction.grossAmount, transaction.currency)}</td>
                    <td>{formatCurrency(transaction.platformFeeAmount, transaction.currency)}</td>
                    <td>{formatCurrency(transaction.creatorNetAmount, transaction.currency)}</td>
                    <td>{transaction.paymentStatus}</td>
                    <td>{transaction.paymentProvider ?? 'manual'}</td>
                    <td>{transaction.purchaseKind}</td>
                    <td>{transaction.entitlementExpiresAt ? formatDateTimeLabel(transaction.entitlementExpiresAt) : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </AppShell>
  );
}


