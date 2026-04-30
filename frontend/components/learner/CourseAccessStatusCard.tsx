import Link from 'next/link';
import { CalendarClock, ShieldCheck, Sparkles } from 'lucide-react';

import { PremiumAccessButton } from '@/components/learner/PremiumAccessButton';
import { describeAccessExpiry } from '@/src/presentation/accessExpiry';
import type { CatalogCourseWorkspaceView } from '@/src/domain/models';

export function CourseAccessStatusCard(props: { view: CatalogCourseWorkspaceView }) {
  const { course, access } = props.view;
  const expiry = describeAccessExpiry(access.activeEntitlement?.expiresAt ?? null);

  if (access.activeEntitlement && expiry) {
    return (
      <section className="course-access-card is-active">
        <div className="inline premium-badge-row">
          <span className={`studio-badge ${expiry.tone === 'warning' ? 'studio-badge-warning' : 'studio-badge-success'}`}>
            <ShieldCheck size={14} />
            {expiry.statusLabel}
          </span>
          <span className="studio-badge studio-badge-muted">{expiry.relativeLabel}</span>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <h3 className="panel-title" style={{ margin: 0 }}>Your access</h3>
          <p className="muted" style={{ margin: 0 }}>
            Premium access stays active until <strong>{expiry.exactLabel}</strong>.
          </p>
          {course.premiumAccessDays ? (
            <p className="muted" style={{ margin: 0 }}>
              Current course access window: {course.premiumAccessDays} day{course.premiumAccessDays === 1 ? '' : 's'} per purchase.
            </p>
          ) : null}
        </div>
        <div className="inline" style={{ gap: 10, flexWrap: 'wrap' }}>
          {access.canRenewPremium ? (
            <PremiumAccessButton courseId={course.id} baseAccessDays={course.premiumAccessDays} label="Renew premium access" />
          ) : null}
          <Link href="/dashboard/transactions" className="button button-secondary">
            View transaction history
          </Link>
        </div>
      </section>
    );
  }

  if (access.canPurchasePremium || access.canRenewPremium) {
    return (
      <section className="course-access-card">
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">
            <Sparkles size={14} />
            Premium access
          </span>
        </div>
        <div className="stack" style={{ gap: 6 }}>
          <h3 className="panel-title" style={{ margin: 0 }}>Unlock premium nodes</h3>
          <p className="muted" style={{ margin: 0 }}>
            Choose between learner premium plans to unlock time-bound access for premium nodes in this course.
          </p>
          {course.premiumAccessDays ? (
            <p className="muted" style={{ margin: 0 }}>
              Base access window per purchase: {course.premiumAccessDays} day{course.premiumAccessDays === 1 ? '' : 's'}.
            </p>
          ) : null}
        </div>
        <div className="inline" style={{ gap: 10, flexWrap: 'wrap' }}>
          <PremiumAccessButton
            courseId={course.id}
            baseAccessDays={course.premiumAccessDays}
            label={access.canRenewPremium ? 'Renew premium access' : 'Unlock premium nodes'}
          />
          <Link href="/dashboard/transactions" className="button button-secondary">
            Open payments
          </Link>
        </div>
      </section>
    );
  }

  if (access.gateReason === 'login_required') {
    return (
      <section className="course-access-card">
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-muted">
            <CalendarClock size={14} />
            Sign in required
          </span>
        </div>
        <h3 className="panel-title" style={{ margin: 0 }}>Log in to unlock premium nodes</h3>
        <p className="muted" style={{ margin: 0 }}>
          Premium access is attached to your learner account, so sign in first to purchase or renew this course.
        </p>
        <div>
          <Link href={`/login?next=${encodeURIComponent(`/courses/${course.id}`)}`} className="button">
            Log in
          </Link>
        </div>
      </section>
    );
  }

  return null;
}


