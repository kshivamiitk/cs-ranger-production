import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { AdminCreatorBalancesTable } from '@/components/admin/AdminCreatorBalancesTable';
import { AdminManualPayoutSection } from '@/components/admin/AdminManualPayoutSection';
import { AdminWithdrawalQueue } from '@/components/admin/AdminWithdrawalQueue';
import { describePayoutMode, env } from '@/lib/env';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';

export default async function AdminCreatorPayoutsPage() {
  const [{ viewer, themeMode }, { adminFinanceService }] = await Promise.all([
    requireServerAdmin('/admin/creator-payouts'),
    createServerContainer(),
  ]);
  const { settings, creatorBalances, withdrawals } = await adminFinanceService.getCreatorPayoutsPage(viewer);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Creator payouts"
      subtitle={describePayoutMode()}
    >
      <section className="panel stack">
        <div className="panel-header panel-header-top-align">
          <div>
            <h2 className="panel-title">Balances owed to creators</h2>
            <p className="muted text-top-gap">
              <strong>Available to pay</strong> is what still sits in the creator wallet and can be withdrawn after minimum amount rules and settlement holds.
            </p>
          </div>
          {env.enableAdminBulkPayout ? (
            <Link href="/admin/bulk-payouts" className="button button-secondary">
              Open bulk payout console
            </Link>
          ) : null}
        </div>
        <AdminCreatorBalancesTable rows={creatorBalances} defaultCurrency={settings.currency} />
      </section>

      {!env.enableSelfWithdrawal && !env.enableAdminBulkPayout ? (
        <AdminManualPayoutSection withdrawals={withdrawals} currency={settings.currency} />
      ) : (
        <section className="panel stack">
          <div>
            <h2 className="panel-title">Withdrawal queue</h2>
            <p className="muted text-top-gap">
              {env.enableAdminBulkPayout
                ? 'Bulk payout mode is active. This queue still records pending provider payouts and any manual reconciliations that need follow-up.'
                : 'Self withdrawal is enabled, so creators initiate RazorpayX payouts from their finance page. Use Mark paid when a payout provider needs a manual fix or reconciliation.'}
            </p>
          </div>
          <AdminWithdrawalQueue withdrawals={withdrawals} />
        </section>
      )}
    </AppShell>
  );
}


