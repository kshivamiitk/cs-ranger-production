import Link from 'next/link';
import { AlertTriangle, Clock3, Flame, Sparkles } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import { describeAccessExpiry } from '@/src/presentation/accessExpiry';
import { requireServerPageContext } from '@/src/presentation/serverPage';

export default async function LearnerAccessCenterPage() {
  const { viewer, themeMode, container } = await requireServerPageContext('/dashboard/access');
  const { learnerDashboardService } = container;
  const dashboard = await learnerDashboardService.getDashboard(viewer, { includeFeed: false });
  const access = dashboard.accessCenter;

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Access Center"
      subtitle="Premium access windows, renewals, streak momentum, and payment recovery from one learner-focused page with calmer premium hierarchy."
    >
      <section className="hero-panel dashboard-hero-band">
        <div className="hero-panel-copy">
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">Access center</span>
            <span className="studio-badge studio-badge-muted">{access.activeCourses.length} active windows</span>
            <span className="studio-badge studio-badge-muted">{access.expiringSoonCourses.length} expiring soon</span>
          </div>
          <div className="hero-panel-title-block">
            <h2 className="headline" style={{ margin: 0 }}>Keep your premium access visible, precise, and renewal-ready.</h2>
            <p className="subheadline" style={{ margin: 0 }}>
              Exact expiry times, streak preservation, pending checkout recovery, and recently unlocked courses all live here so the premium experience feels trustworthy.
            </p>
          </div>
        </div>

        <aside className="dashboard-signal-grid">
          <article className="dashboard-signal-card">
            <span className="section-label">Current streak</span>
            <strong>{dashboard.streak.currentDays} days</strong>
            <span className="muted">Longest {dashboard.streak.longestDays} days · {dashboard.streak.totalActiveDays} active days total</span>
          </article>
          <article className="dashboard-signal-card">
            <span className="section-label">Pending recovery</span>
            <strong>{access.pendingTransactions.length} pending premium payments</strong>
            <span className="muted">Resume incomplete checkouts before you lose momentum or access intent.</span>
          </article>
        </aside>
      </section>

      <section className="stat-grid">
        <StatCard label="Active courses" value={String(access.activeCourses.length)} icon={<Sparkles size={18} />} />
        <StatCard label="Expiring soon" value={String(access.expiringSoonCourses.length)} icon={<Clock3 size={18} />} />
        <StatCard label="Expired windows" value={String(access.expiredCourses.length)} icon={<AlertTriangle size={18} />} />
        <StatCard label="Current streak" value={`${dashboard.streak.currentDays} days`} icon={<Flame size={18} />} />
      </section>

      <section className="feed-layout">
        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Expiring premium windows</h2>
              <p className="muted">Exact expiry timing plus the courses you should renew first.</p>
            </div>
            <Link href="/dashboard/transactions" className="button button-secondary">
              Open transactions
            </Link>
          </div>

          {access.activeCourses.length === 0 ? (
            <div className="empty-state">No active premium entitlements right now.</div>
          ) : (
            <div className="editorial-list">
              {access.activeCourses.map((course) => {
                const expiry = describeAccessExpiry(course.access.activeEntitlement?.expiresAt ?? null);
                return (
                  <article key={course.id} className="editorial-list-item">
                    <div className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
                      <div className="inline premium-badge-row">
                        <span className={`studio-badge ${expiry?.tone === 'warning' ? 'studio-badge-warning' : 'studio-badge-success'}`}>
                          {expiry?.statusLabel ?? 'Active'}
                        </span>
                        <span className="studio-badge studio-badge-muted">{expiry?.relativeLabel ?? 'No expiry available'}</span>
                      </div>
                      <Link href={`/courses/${course.id}`} className="button button-secondary">Open course</Link>
                    </div>
                    <div className="stack" style={{ gap: 8 }}>
                      <h3 className="panel-title" style={{ margin: 0 }}>{course.title}</h3>
                      <p className="muted" style={{ margin: 0 }}>Active until {expiry?.exactLabel ?? '—'}</p>
                      <span className="muted">{course.progress?.completionPercent ?? 0}% complete</span>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>

        <aside className="stack-lg">
          <section className="panel stack dashboard-feature-panel">
            <div className="panel-header">
              <div>
                <h2 className="panel-title">Momentum + recovery</h2>
                <p className="muted">Keep your learning streak alive while recovering pending premium purchases.</p>
              </div>
            </div>

            <article className="dashboard-mini-card">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">Streak</span>
              </div>
              <h3 className="panel-title" style={{ margin: 0 }}>{dashboard.streak.currentDays} day current streak</h3>
              <p className="muted dashboard-mini-copy">
                Longest: {dashboard.streak.longestDays} days · Total active days: {dashboard.streak.totalActiveDays}
              </p>
              <span className="muted">
                {dashboard.streak.lastActiveAt ? `Last active ${formatDateTimeLabel(dashboard.streak.lastActiveAt)}` : 'Complete a node to start your streak.'}
              </span>
            </article>

            <div className="stack">
              {access.pendingTransactions.length === 0 ? (
                <div className="empty-state compact">No pending premium payments right now.</div>
              ) : (
                access.pendingTransactions.map((transaction) => (
                  <article key={transaction.purchaseId} className="dashboard-mini-card">
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-warning">Pending payment</span>
                    </div>
                    <h3 className="panel-title" style={{ margin: 0 }}>{transaction.courseTitle}</h3>
                    <p className="muted dashboard-mini-copy">
                      {formatCurrency(transaction.grossAmount, transaction.currency)} · Created {formatDateTimeLabel(transaction.createdAt)}
                    </p>
                    <Link href="/dashboard/transactions" className="button button-secondary">Resume checkout</Link>
                  </article>
                ))
              )}
            </div>
          </section>

          <section className="panel stack">
            <h3 className="panel-title" style={{ margin: 0 }}>Recent unlocks</h3>
            {access.recentUnlocks.length === 0 ? (
              <div className="empty-state compact">Your latest premium unlocks will appear here.</div>
            ) : (
              access.recentUnlocks.slice(0, 5).map((item) => (
                <article key={item.purchaseId} className="dashboard-link-card">
                  <strong>{item.courseTitle}</strong>
                  <span className="muted">Unlocked {formatDateTimeLabel(item.paidAt ?? item.createdAt)}</span>
                </article>
              ))
            )}
          </section>
        </aside>
      </section>
    </AppShell>
  );
}
