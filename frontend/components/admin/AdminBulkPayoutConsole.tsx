'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { Button } from '@/components/ui/Button';
import { apiJson } from '@/src/presentation/http/client';
import { formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import type { AdminBulkPayoutConsole as AdminBulkPayoutConsoleModel } from '@/src/domain/models';

export function AdminBulkPayoutConsole(props: { consoleData: AdminBulkPayoutConsoleModel }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<'dry' | 'run' | null>(null);
  const [isPending, startTransition] = useTransition();

  const currency = props.consoleData.settings.currency;
  const totalEligibleAmount = props.consoleData.eligibleCandidates.reduce(
    (sum, candidate) => sum + candidate.availableAmount,
    0
  );

  function executeBulkPayout(dryRun: boolean) {
    setError(null);
    setSuccess(null);
    setPendingAction(dryRun ? 'dry' : 'run');
    startTransition(async () => {
      try {
        const result = await apiJson<{
          dryRun: boolean;
          summary?: { selectedCount: number; processedCount: number; failedCount: number; pendingCount: number };
          selectedCount?: number;
        }>('/api/admin/bulk-payouts', {
          method: 'POST',
          body: JSON.stringify({ dryRun }),
        });
        if (dryRun) {
          setSuccess(
            `Dry run complete. ${result.selectedCount ?? props.consoleData.eligibleCandidates.length} creators are currently eligible.`
          );
        } else if (result.summary) {
          setSuccess(
            `Batch finished. Processed ${result.summary.processedCount}, pending ${result.summary.pendingCount}, failed ${result.summary.failedCount}.`
          );
        } else {
          setSuccess('Bulk payout batch finished.');
        }
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to run bulk payout batch.');
      } finally {
        setPendingAction(null);
      }
    });
  }

  return (
    <section className="stack-lg">
      <section className="panel stack">
        <div className="panel-header panel-header-top-align">
          <div>
            <h2 className="panel-title">Eligible creators</h2>
            <p className="muted">
              Every eligible creator is paid their full available balance, provided they have saved a payout destination and meet the minimum threshold.
            </p>
            {props.consoleData.nextScheduledLabel ? (
              <p className="muted">Configured schedule: {props.consoleData.nextScheduledLabel}</p>
            ) : null}
          </div>
          <div className="stack admin-bulk-actions">
            <Button
              type="button"
              variant="secondary"
              disabled={isPending}
              onClick={() => executeBulkPayout(true)}
            >
              {pendingAction === 'dry' ? 'Running dry run...' : 'Dry run'}
            </Button>
            <Button type="button" disabled={isPending} onClick={() => executeBulkPayout(false)}>
              {pendingAction === 'run' ? 'Sending payouts...' : 'Run bulk payout now'}
            </Button>
          </div>
        </div>

        <div className="admin-bulk-summary-grid">
          <article className="card stack-gap-8">
            <strong>Eligible creators</strong>
            <span>{props.consoleData.eligibleCandidates.length}</span>
          </article>
          <article className="card stack-gap-8">
            <strong>Skipped creators</strong>
            <span>{props.consoleData.skippedCandidates.length}</span>
          </article>
          <article className="card stack-gap-8">
            <strong>Total payable now</strong>
            <span>{formatCurrency(totalEligibleAmount, currency)}</span>
          </article>
          <article className="card stack-gap-8">
            <strong>Minimum threshold</strong>
            <span>{formatCurrency(props.consoleData.settings.minimumWithdrawalAmount, currency)}</span>
          </article>
        </div>

        {error ? <div className="studio-inline-alert">{error}</div> : null}
        {success ? <div className="studio-inline-notice">{success}</div> : null}
      </section>

      <section className="panel stack">
        <div>
          <h2 className="panel-title">Preview</h2>
          <p className="muted">This is the wallet snapshot that will be used for the next batch run.</p>
        </div>
        {props.consoleData.candidates.length === 0 ? (
          <div className="empty-state">No creator balances are available yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="app-table">
              <thead>
                <tr>
                  <th>Creator</th>
                  <th>Available</th>
                  <th>Payout destination</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {props.consoleData.candidates.map((candidate) => (
                  <tr key={candidate.creatorUserId}>
                    <td>
                      <div className="stack stack-gap-4">
                        <strong>{candidate.creatorName ?? candidate.creatorUserId}</strong>
                        <span className="muted text-break-anywhere">{candidate.creatorUserId}</span>
                      </div>
                    </td>
                    <td>{formatCurrency(candidate.availableAmount, candidate.currency)}</td>
                    <td>{candidate.payoutProfile?.maskedPayoutLabel ?? 'Not saved yet'}</td>
                    <td>
                      <span className={candidate.eligible ? 'studio-badge studio-badge-primary' : 'studio-badge studio-badge-muted'}>
                        {candidate.eligible ? 'eligible' : candidate.reason ?? 'skipped'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <section className="panel stack">
        <div>
          <h2 className="panel-title">Recent batches</h2>
          <p className="muted">Each batch records the selected wallet total and the final reconciliation summary.</p>
        </div>
        {props.consoleData.batches.length === 0 ? (
          <div className="empty-state">No bulk payout batches yet.</div>
        ) : (
          <div className="stack">
            {props.consoleData.batches.map((batch) => (
              <article key={batch.id} className="card stack-gap-8">
                <div className="panel-header panel-header-top-align">
                  <div className="stack stack-gap-4">
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-primary">{batch.status}</span>
                      <span className="studio-badge studio-badge-muted">{batch.mode.replace('_', ' ')}</span>
                    </div>
                    <strong>{formatCurrency(batch.totalAmountSelected, batch.currency)}</strong>
                    <span className="muted">
                      {batch.totalCreatorsSelected} creators selected · processed {formatCurrency(batch.totalAmountProcessed, batch.currency)}
                    </span>
                    {batch.notes ? <span className="muted">{batch.notes}</span> : null}
                  </div>
                  <span className="muted">{formatDateTimeLabel(batch.createdAt)}</span>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}


