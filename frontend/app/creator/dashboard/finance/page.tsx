import Link from 'next/link';

import { CreatorStudioShell } from '@/components/creator/CreatorStudioShell';
import {
  CreatorPayoutRulesArticle,
  CreatorWithdrawalFlowPanel,
  CreatorWithdrawalHistorySection,
} from '@/components/creator/creator-dashboard-blocks';
import { CreatorPayoutProfileForm } from '@/components/finance/CreatorPayoutProfileForm';
import { StatCard } from '@/components/ui/StatCard';
import { describePayoutMode, env } from '@/lib/env';
import { formatCurrency } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorFinancePage() {
  const [{ viewer, themeMode }, { creatorFinanceService }] = await Promise.all([
    requireServerCreator('/creator/dashboard/finance'),
    createServerContainer(),
  ]);
  const [{ summary, withdrawals, settings }, payoutProfile] = await Promise.all([
    creatorFinanceService.getCreatorDashboard(viewer),
    creatorFinanceService.getPayoutProfile(viewer),
  ]);

  return (
    <CreatorStudioShell
      viewer={viewer}
      themeMode={themeMode}
      title="Finance"
      subtitle={describePayoutMode()}
      actions={
        <Link href="/creator/courses/new" className="button">
          Create course
        </Link>
      }
    >
      <section className="stat-grid">
        <StatCard label="Available balance" value={formatCurrency(summary.availableAmount, summary.currency)} />
        <StatCard label="Pending settlement" value={formatCurrency(summary.pendingSettlementAmount, summary.currency)} />
        <StatCard label="Pending withdrawals" value={formatCurrency(summary.pendingWithdrawalAmount, summary.currency)} />
      </section>

      <section className="grid-2">
        <div className="stack-lg">
          <CreatorWithdrawalFlowPanel summary={summary} settings={settings} payoutProfile={payoutProfile} />
          <CreatorPayoutProfileForm
            profile={payoutProfile}
            helpText={env.enableAdminBulkPayout ? 'Bulk payout mode is active, so this saved destination is required before Tuesday-style payouts can include you.' : undefined}
          />
          <CreatorPayoutRulesArticle
            settings={settings}
            selfServiceWithdrawalsEnabled={env.enableSelfWithdrawal}
            bulkPayoutsEnabled={env.enableAdminBulkPayout}
          />
        </div>
        <CreatorWithdrawalHistorySection withdrawals={withdrawals} />
      </section>
    </CreatorStudioShell>
  );
}


