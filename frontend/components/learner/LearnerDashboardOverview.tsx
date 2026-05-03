import Link from 'next/link';
import { ArrowRight, Bookmark, Clock3, Flame, GraduationCap, Receipt, Rss, Sparkles, Trophy, Users } from 'lucide-react';

import type { LearnerDashboardViewModel } from '@/src/application/LearnerDashboardApplicationService';
import { StatCard } from '@/components/ui/StatCard';
import { formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import { describeAccessExpiry } from '@/src/presentation/accessExpiry';

export function LearnerDashboardOverview(props: { dashboard: LearnerDashboardViewModel }) {
  const { dashboard } = props;
  const currentCourse = dashboard.continueLearningCourses[0] ?? null;
  const unlockedBadges = dashboard.badges.filter((badge) => badge.achieved);
  const feedHead = dashboard.feed.items.slice(0, 4);

  return (
    <div className="stack-lg">
      <section className="hero-panel dashboard-hero-band">
        <div className="hero-panel-copy">
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">Learner home</span>
            <span className="studio-badge studio-badge-muted">{dashboard.stats.activePremiumCourses} active premium</span>
            <span className="studio-badge studio-badge-muted">{dashboard.streak.currentDays} day streak</span>
          </div>
          <div className="hero-panel-title-block">
            <h2 className="headline flush">Study from one calm premium workspace.</h2>
            <p className="subheadline flush">
              Continue your strongest course, watch premium access windows, follow creator releases, and keep your streak alive without digging through scattered tools.
            </p>
          </div>
          <div className="hero-actions-inline">
            <Link href={currentCourse ? `/courses/${currentCourse.id}` : '/courses'} className="button">
              {currentCourse ? 'Resume flagship course' : 'Explore courses'}
            </Link>
            <Link href="/dashboard/feed" className="button button-secondary">
              <Rss size={16} />
              Open feed
            </Link>
          </div>
        </div>

        <aside className="dashboard-signal-grid">
          <article className="dashboard-signal-card">
            <span className="section-label">Continue learning</span>
            <strong>{currentCourse?.title ?? 'No course in progress yet'}</strong>
            <span className="muted">
              {currentCourse?.progress?.continueLearning
                ? `${currentCourse.progress.completionPercent ?? 0}% complete · next node ready`
                : 'Start a course and your next step will show here.'}
            </span>
          </article>
          <article className="dashboard-signal-card">
            <span className="section-label">Premium watchlist</span>
            <strong>{dashboard.expiringCourses[0]?.title ?? 'No active expiry yet'}</strong>
            <span className="muted">
              {dashboard.expiringCourses[0]?.access.activeEntitlement?.expiresAt
                ? `Active until ${formatDateTimeLabel(dashboard.expiringCourses[0].access.activeEntitlement?.expiresAt ?? '')}`
                : 'Active entitlement timing appears once a premium course unlocks.'}
            </span>
          </article>
        </aside>
      </section>

      <section className="stat-grid">
        <StatCard label="Published courses" value={String(dashboard.stats.publishedCourses)} icon={<GraduationCap size={18} />} />
        <StatCard label="Continue learning" value={String(dashboard.stats.continueLearningCourses)} icon={<ArrowRight size={18} />} />
        <StatCard label="Active premium" value={String(dashboard.stats.activePremiumCourses)} icon={<Sparkles size={18} />} />
        <StatCard label="Pending payments" value={String(dashboard.stats.pendingPayments)} icon={<Receipt size={18} />} />
        <StatCard label="Saved nodes" value={String(dashboard.stats.savedNodes)} icon={<Bookmark size={18} />} />
        <StatCard label="Saved courses" value={String(dashboard.stats.savedCourses)} icon={<Bookmark size={18} />} />
        <StatCard label="Followed creators" value={String(dashboard.stats.followedCreators)} icon={<Users size={18} />} />
      </section>

      <section className="dashboard-feature-grid">
        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Continue learning</h2>
              <p className="muted">Jump back into the exact course where your progress already exists.</p>
            </div>
            <Link href="/courses" className="button button-secondary">
              Open catalog
            </Link>
          </div>

          {dashboard.continueLearningCourses.length === 0 ? (
            <div className="empty-state">No in-progress courses yet. Start a course and your next step will appear here.</div>
          ) : (
            <div className="dashboard-mini-card-grid">
              {dashboard.continueLearningCourses.map((course) => (
                <article key={course.id} className="dashboard-mini-card">
                  <div className="stack stack-compact">
                    <span className="studio-badge studio-badge-primary">{course.progress?.completionPercent ?? 0}% complete</span>
                    <h3 className="panel-title flush">{course.title}</h3>
                    <p className="muted dashboard-mini-copy">
                      {course.progress?.lastVisited
                        ? `Last visited: ${course.progress.lastVisited.nodeTitle}`
                        : 'Start from the first unlocked node.'}
                    </p>
                  </div>
                  <div className="inline split-inline">
                    <span className="muted">
                      {course.progress?.completedNodeCount ?? 0}/{course.progress?.accessibleNodeCount ?? 0} nodes complete
                    </span>
                    <Link
                      href={course.progress?.continueLearning ? `/courses/${course.id}/nodes/${course.progress.continueLearning.nodeId}` : `/courses/${course.id}`}
                      className="button"
                    >
                      Continue
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Premium access watchlist</h2>
              <p className="muted">See exactly when access expires and renew before the window closes.</p>
            </div>
            <Link href="/dashboard/access" className="button button-secondary">
              Open access center
            </Link>
          </div>

          {dashboard.expiringCourses.length === 0 ? (
            <div className="empty-state">No active premium access windows right now.</div>
          ) : (
            <div className="stack">
              {dashboard.expiringCourses.map((course) => {
                const expiry = describeAccessExpiry(course.access.activeEntitlement?.expiresAt ?? null);
                if (!expiry) {
                  return null;
                }

                return (
                  <article key={course.id} className="dashboard-timeline-card">
                    <div className="stack stack-micro">
                      <div className="inline premium-badge-row">
                        <span className={`studio-badge ${expiry.tone === 'warning' ? 'studio-badge-warning' : 'studio-badge-success'}`}>
                          {expiry.statusLabel}
                        </span>
                        <span className="studio-badge studio-badge-muted">{expiry.relativeLabel}</span>
                      </div>
                      <h3 className="panel-title flush">{course.title}</h3>
                      <p className="muted flush">
                        Active until <strong>{expiry.exactLabel}</strong>
                      </p>
                    </div>
                    <div className="inline split-inline">
                      <span className="muted">{course.premiumAccessDays ? `${course.premiumAccessDays} day base access` : 'Premium access'}</span>
                      <Link href={`/courses/${course.id}`} className="button button-secondary">
                        View course
                      </Link>
                    </div>
                  </article>
                );
              })}
            </div>
          )}
        </section>
      </section>

      <section className="dashboard-feature-grid">
        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Feed preview</h2>
              <p className="muted">Fresh launches and updates from creators you follow.</p>
            </div>
            <Link href="/dashboard/feed" className="button button-secondary">
              Open full feed
            </Link>
          </div>

          {feedHead.length === 0 ? (
            <div className="empty-state">No feed items yet. Follow creators and their newest launches will appear here.</div>
          ) : (
            <div className="editorial-list">
              {feedHead.map((item) => (
                <Link key={item.id} href={item.href} className="editorial-list-item">
                  <div className="stack stack-micro">
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-primary">{item.kind.replaceAll('_', ' ')}</span>
                      <span className="studio-badge studio-badge-muted">{formatDateTimeLabel(item.occurredAt)}</span>
                    </div>
                    <strong>{item.summary}</strong>
                    <span className="muted">{item.creatorName ?? 'Unknown creator'} · {item.courseTitle}</span>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </section>

        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Saved for later + milestones</h2>
              <p className="muted">Your saved nodes, wishlisted courses, and achievement shelf stay one click away.</p>
            </div>
            <div className="inline action-cluster">
              <Link href="/dashboard/bookmarks" className="button button-secondary">
                Bookmarks
              </Link>
              <Link href="/dashboard/wishlist" className="button button-secondary">
                Wishlist
              </Link>
            </div>
          </div>

          <div className="dashboard-saved-grid">
            <div className="stack">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">
                  <Bookmark size={14} />
                  Saved nodes
                </span>
              </div>
              {dashboard.savedNodes.length === 0 ? (
                <div className="empty-state compact">No saved nodes yet.</div>
              ) : (
                dashboard.savedNodes.map((item) => (
                  <Link key={item.nodeId} href={`/courses/${item.courseId}/nodes/${item.nodeId}`} className="dashboard-link-card">
                    <strong>{item.nodeTitle}</strong>
                    <span className="muted">{item.courseTitle} · {item.moduleTitle}</span>
                  </Link>
                ))
              )}
            </div>

            <div className="stack">
              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-success">
                  <Trophy size={14} />
                  Earned badges
                </span>
              </div>
              {unlockedBadges.length === 0 ? (
                <div className="empty-state compact">Your first badge will unlock automatically as you study.</div>
              ) : (
                unlockedBadges.slice(0, 4).map((badge) => (
                  <article key={badge.id} className="dashboard-link-card">
                    <strong>{badge.label}</strong>
                    <span className="muted">{badge.description}</span>
                  </article>
                ))
              )}
            </div>
          </div>
        </section>
      </section>

      <section className="dashboard-feature-grid">
        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Pending payments</h2>
              <p className="muted">Resume incomplete checkouts without digging through your inbox or payment history.</p>
            </div>
            <Link href="/dashboard/transactions" className="button button-secondary">
              Manage payments
            </Link>
          </div>

          {dashboard.pendingTransactions.length === 0 ? (
            <div className="empty-state">No pending payments. Completed and failed purchases will still appear in transaction history.</div>
          ) : (
            <div className="stack">
              {dashboard.pendingTransactions.map((transaction) => (
                <article key={transaction.purchaseId} className="dashboard-mini-card">
                  <div className="inline premium-badge-row">
                    <span className="studio-badge studio-badge-warning">Pending</span>
                    <span className="studio-badge studio-badge-muted">{transaction.paymentProvider ?? 'manual'}</span>
                  </div>
                  <h3 className="panel-title flush">{transaction.courseTitle}</h3>
                  <p className="muted dashboard-mini-copy">
                    Created {formatDateTimeLabel(transaction.createdAt)} · {formatCurrency(transaction.grossAmount, transaction.currency)}
                  </p>
                  <div className="inline split-inline">
                    <span className="muted">Resume checkout from the transaction page.</span>
                    <Link href="/dashboard/transactions" className="button button-secondary">
                      Resume
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>

        <section className="panel stack dashboard-feature-panel">
          <div className="panel-header">
            <div>
              <h2 className="panel-title">Streak momentum</h2>
              <p className="muted">A calm place to keep the habit alive before you slip out of rhythm.</p>
            </div>
          </div>
          <article className="dashboard-mini-card">
            <div className="inline premium-badge-row">
              <span className="studio-badge studio-badge-primary">
                <Flame size={14} />
                Current streak
              </span>
              <span className="studio-badge studio-badge-muted">Longest {dashboard.streak.longestDays} days</span>
            </div>
            <h3 className="panel-title flush">{dashboard.streak.currentDays} day current streak</h3>
            <p className="muted dashboard-mini-copy">
              Total active days: {dashboard.streak.totalActiveDays} · {dashboard.streak.lastActiveAt ? `Last active ${formatDateTimeLabel(dashboard.streak.lastActiveAt)}` : 'Complete a node to start your streak.'}
            </p>
            <Link href="/courses" className="button button-secondary">Continue today</Link>
          </article>
        </section>
      </section>
    </div>
  );
}
