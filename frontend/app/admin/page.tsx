import Link from 'next/link';
import { Award, Banknote, MessageSquareText, Receipt, SlidersHorizontal } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerAdmin } from '@/src/presentation/serverPage';

export default async function AdminIndexPage() {
  const [{ viewer, themeMode }, { adminFinanceService, certificateService }] = await Promise.all([
    requireServerAdmin('/admin'),
    createServerContainer(),
  ]);
  const [dashboard, issuedCertificates] = await Promise.all([
    adminFinanceService.getDashboard(viewer),
    certificateService.getAdminIssuedCertificates(viewer),
  ]);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Admin"
      title="Overview"
      subtitle="High-level finance and entitlement KPIs. Open a section from the sidebar or the shortcuts below."
    >
      <section className="stat-grid">
        <StatCard label="GMV" value={formatCurrency(dashboard.summary.totalGmv, dashboard.settings.currency)} />
        <StatCard
          label="Platform revenue"
          value={formatCurrency(dashboard.summary.totalPlatformRevenue, dashboard.settings.currency)}
        />
        <StatCard
          label="Creator net"
          value={formatCurrency(dashboard.summary.totalCreatorNetCredited, dashboard.settings.currency)}
        />
        <StatCard
          label="Pending settlement"
          value={formatCurrency(dashboard.summary.totalPendingSettlement, dashboard.settings.currency)}
        />
        <StatCard
          label="Available creator balances"
          value={formatCurrency(dashboard.summary.totalAvailableCreatorBalances, dashboard.settings.currency)}
        />
        <StatCard
          label="Pending withdrawals"
          value={formatCurrency(dashboard.summary.totalPendingWithdrawals, dashboard.settings.currency)}
        />
        <StatCard
          label="Paid withdrawals"
          value={formatCurrency(dashboard.summary.totalPaidWithdrawals, dashboard.settings.currency)}
        />
        <StatCard label="Active entitlements" value={String(dashboard.summary.activePremiumEntitlementsCount)} />
        <StatCard label="Expired entitlements" value={String(dashboard.summary.expiredPremiumEntitlementsCount)} />
        <StatCard label="Issued certificates" value={String(issuedCertificates.length)} />
      </section>

      <section className="panel stack">
        <h2 className="panel-title">Shortcuts</h2>
        <p className="muted" style={{ margin: 0 }}>
          Each admin area has its own page so finance, payouts, and moderation stay easy to scan.
        </p>
        <div className="grid-2" style={{ marginTop: 12 }}>
          <Link href="/admin/finance-settings" className="card search-result-card" style={{ gap: 8 }}>
            <div className="inline" style={{ gap: 8 }}>
              <SlidersHorizontal size={18} aria-hidden />
              <strong>Finance settings</strong>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Platform fee, minimum withdrawal, settlement hold.
            </p>
          </Link>
          <Link href="/admin/creator-payouts" className="card search-result-card" style={{ gap: 8 }}>
            <div className="inline" style={{ gap: 8 }}>
              <Banknote size={18} aria-hidden />
              <strong>Creator payouts</strong>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Per-creator balances, manual payout records, and mark-paid queue.
            </p>
          </Link>
          <Link href="/admin/transactions" className="card search-result-card" style={{ gap: 8 }}>
            <div className="inline" style={{ gap: 8 }}>
              <Receipt size={18} aria-hidden />
              <strong>Premium transactions</strong>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Recent purchases, fees, and entitlement expiries.
            </p>
          </Link>
          <Link href="/admin/certificates" className="card search-result-card" style={{ gap: 8 }}>
            <div className="inline" style={{ gap: 8 }}>
              <Award size={18} aria-hidden />
              <strong>Issued certificates</strong>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              All learner certificates across courses.
            </p>
          </Link>
          <Link href="/admin/support" className="card search-result-card" style={{ gap: 8 }}>
            <div className="inline" style={{ gap: 8 }}>
              <MessageSquareText size={18} aria-hidden />
              <strong>Moderation inbox</strong>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Support inbox for complaints and suggestions.
            </p>
          </Link>
        </div>
      </section>
    </AppShell>
  );
}


