'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { apiJson } from '@/src/presentation/http/client';
import type { AdminWithdrawalQueueItem } from '@/src/domain/models';
import { formatCurrency, formatDateLabel } from '@/lib/utils';

export function AdminWithdrawalQueue(props: {
  withdrawals: AdminWithdrawalQueueItem[];
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function updateStatus(withdrawalId: string, status: 'paid' | 'rejected') {
    setError(null);
    setPendingId(withdrawalId);

    startTransition(async () => {
      try {
        await apiJson(`/api/admin/withdrawals/${withdrawalId}`, {
          method: 'PATCH',
          body: JSON.stringify({ status }),
        });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Withdrawal update failed.');
      } finally {
        setPendingId(null);
      }
    });
  }

  return (
    <div className="stack">
      <div>
        <h3 className="panel-title">Queue</h3>
        <p className="muted text-top-gap">
          Mark payouts paid after you complete the external transfer, or reject to release reserved balance back to the
          creator wallet.
        </p>
      </div>

      {error ? <div className="studio-inline-alert">{error}</div> : null}

      {props.withdrawals.length === 0 ? (
        <div className="empty-state">No withdrawal requests in the queue.</div>
      ) : (
        <div className="stack">
          {props.withdrawals.map((withdrawal) => {
            const pending = isPending && pendingId === withdrawal.id;
            return (
              <article key={withdrawal.id} className="card stack stack-gap-12">
                <div className="panel-header">
                  <div className="stack stack-gap-8">
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-primary">{withdrawal.status}</span>
                      <span className="studio-badge studio-badge-muted">
                        Requested {formatDateLabel(withdrawal.requestedAt)}
                      </span>
                    </div>
                    <strong>{withdrawal.creatorName ?? withdrawal.creatorUserId}</strong>
                    <p className="muted text-no-margin">{withdrawal.payoutMethodSnapshot}</p>
                  </div>
                  <strong>{formatCurrency(withdrawal.amount, withdrawal.currency)}</strong>
                </div>

                <div className="inline">
                  <Button
                    type="button"
                    variant="secondary"
                    disabled={pending || withdrawal.status === 'paid'}
                    onClick={() => updateStatus(withdrawal.id, 'paid')}
                  >
                    {pending ? 'Updating...' : 'Mark paid'}
                  </Button>
                  <Button
                    type="button"
                    variant="danger"
                    disabled={pending || withdrawal.status === 'rejected'}
                    onClick={() => updateStatus(withdrawal.id, 'rejected')}
                  >
                    Reject
                  </Button>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}


