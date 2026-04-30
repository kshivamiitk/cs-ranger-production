import { AppShell } from '@/components/app-shell/AppShell';
import { AdminFinanceSettingsForm } from '@/components/admin/AdminFinanceSettingsForm';
import { describePayoutMode, env } from '@/lib/env';
import { formatCurrency } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';

export default async function AdminFinanceSettingsPage() {
  const [{ viewer, themeMode }, { adminFinanceService }] = await Promise.all([
    requireServerAdmin('/admin/finance-settings'),
    createServerContainer(),
  ]);
  const settings = await adminFinanceService.getPlatformSettingsForAdmin(viewer);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Finance settings"
      subtitle="Platform fee floor, minimum withdrawal, settlement hold, and payout-mode policy details. Changes apply to new settlements and creator withdrawal checks."
    >
      <section className="grid-2">
        <AdminFinanceSettingsForm settings={settings} />
        <section className="panel stack">
          <div>
            <h2 className="panel-title">Finance policy</h2>
            <p className="muted text-top-gap">{describePayoutMode()}</p>
          </div>

          <div className="stack">
            <div className="card stack stack-gap-8">
              <strong>Current fee floor</strong>
              <span className="muted">
                {settings.platformFeePercent}% platform fee · minimum withdrawal{' '}
                {formatCurrency(settings.minimumWithdrawalAmount, settings.currency)}
              </span>
            </div>
            <div className="card stack stack-gap-8">
              <strong>Settlement hold</strong>
              <span className="muted">
                {settings.settlementHoldDays > 0
                  ? `${settings.settlementHoldDays} day hold before creator funds become available`
                  : 'No settlement hold configured'}
              </span>
            </div>
            <div className="card stack stack-gap-8">
              <strong>Bulk payout environment</strong>
              <span className="muted">PAYOUT_MODE = {env.payoutMode}</span>
              <span className="muted">
                {env.enableAdminBulkPayout
                  ? `Auto-run ${env.adminBulkPayoutAuto ? 'enabled' : 'disabled'} · ${env.adminBulkPayoutDay} ${env.adminBulkPayoutTimeUtc} ${env.adminBulkPayoutTimezone}`
                  : 'Bulk payout mode is disabled for this deployment.'}
              </span>
            </div>
          </div>
        </section>
      </section>
    </AppShell>
  );
}


