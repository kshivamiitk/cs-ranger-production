import Link from 'next/link';

import { formatCurrency } from '@/lib/utils';
import type { AdminCreatorBalanceListItem } from '@/src/domain/models';

type AdminCreatorBalancesTableProps = {
  rows: AdminCreatorBalanceListItem[];
  defaultCurrency: string;
};

export function AdminCreatorBalancesTable({ rows, defaultCurrency }: AdminCreatorBalancesTableProps) {
  if (rows.length === 0) {
    return <div className="empty-state">No creator balance rows yet. Balances appear after premium sales settle.</div>;
  }

  return (
    <div className="table-wrap">
      <table className="app-table">
        <thead>
          <tr>
            <th>Creator</th>
            <th>Available to pay</th>
            <th>Pending settlement</th>
            <th>Reserved in queue</th>
            <th>Withdrawn (lifetime)</th>
            <th>Total earned</th>
            <th>Currency</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const currency = row.currency || defaultCurrency;
            return (
              <tr key={row.creatorUserId}>
                <td>
                  <div className="stack stack-gap-4">
                    <strong>{row.creatorName ?? 'Unknown creator'}</strong>
                    <span className="muted">
                      <Link href={`/creators/${row.creatorUserId}`} className="text-break-anywhere">
                        {row.creatorUserId}
                      </Link>
                    </span>
                  </div>
                </td>
                <td>
                  <strong>{formatCurrency(row.availableAmount, currency)}</strong>
                  <p className="muted text-top-gap text-small">
                    Remaining in wallet after holds and queued withdrawals.
                  </p>
                </td>
                <td>{formatCurrency(row.pendingSettlementAmount, currency)}</td>
                <td>{formatCurrency(row.pendingWithdrawalAmount, currency)}</td>
                <td>{formatCurrency(row.withdrawnAmount, currency)}</td>
                <td>{formatCurrency(row.totalEarnedAmount, currency)}</td>
                <td>{currency}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}


