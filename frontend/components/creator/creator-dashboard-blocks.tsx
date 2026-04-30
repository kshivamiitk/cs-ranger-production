import Link from 'next/link';

import { WithdrawalRequestForm } from '@/components/finance/WithdrawalRequestForm';
import { formatCurrency, formatDateTimeLabel } from '@/lib/utils';
import { env } from '@/lib/env';
import type {
  CourseOverview,
  CreatorBalanceSummary,
  CreatorCourseCertificateSummary,
  CreatorPremiumSale,
  CreatorPayoutProfile,
  PlatformSettings,
  WithdrawalRequest,
} from '@/src/domain/models';

export function CreatorPayoutRulesArticle({
  settings,
  selfServiceWithdrawalsEnabled,
  bulkPayoutsEnabled,
}: {
  settings: PlatformSettings;
  selfServiceWithdrawalsEnabled: boolean;
  bulkPayoutsEnabled?: boolean;
}) {
  return (
    <article className="panel stack">
      <div>
        <h2 className="panel-title">Payout rules</h2>
        <p className="muted">
          Minimum withdrawal is {formatCurrency(settings.minimumWithdrawalAmount, settings.currency)}.
          {settings.settlementHoldDays > 0
            ? ` Premium sales stay in pending settlement for ${settings.settlementHoldDays} days before they move into available balance.`
            : ' Premium sales credit directly into available balance after verified payment.'}{' '}
          {selfServiceWithdrawalsEnabled
            ? 'Withdrawals are initiated on demand through RazorpayX and tracked here as the provider updates status.'
            : bulkPayoutsEnabled
              ? 'Admin bulk payout mode is active, so eligible creators are paid automatically or in a single admin batch when their available balance reaches the minimum threshold.'
              : 'Withdrawals are recorded by administrators after an off-platform transfer; you will see each payout row move from pending to paid when it is reconciled.'}
        </p>
      </div>
    </article>
  );
}

export function CreatorWithdrawalFlowPanel({
  summary,
  settings,
  payoutProfile,
}: {
  summary: CreatorBalanceSummary;
  settings: PlatformSettings;
  payoutProfile: CreatorPayoutProfile | null;
}) {
  const selfServiceWithdrawalsEnabled = env.enableSelfWithdrawal;

  if (selfServiceWithdrawalsEnabled) {
    return (
      <WithdrawalRequestForm
        availableBalance={summary.availableAmount}
        currency={summary.currency}
        minimumWithdrawalAmount={settings.minimumWithdrawalAmount}
        defaultPayoutMethodSnapshot={payoutProfile?.payoutMethodSnapshot ?? ''}
      />
    );
  }

  if (env.enableAdminBulkPayout) {
    return (
      <article className="panel stack">
        <div>
          <h2 className="panel-title">Automatic creator payouts</h2>
          <p className="muted">
            This deployment uses admin bulk payout mode. Save one payout destination below and the admin can pay your full available balance in Tuesday-style batches without creating manual queue entries one by one.
          </p>
        </div>
        <div className="card stack stack-gap-8">
          <strong>Wallet snapshot</strong>
          <span className="muted">Available: {formatCurrency(summary.availableAmount, summary.currency)}</span>
          <span className="muted">Pending settlement: {formatCurrency(summary.pendingSettlementAmount, summary.currency)}</span>
          <span className="muted">Saved payout destination: {payoutProfile?.maskedPayoutLabel ?? 'Not saved yet'}</span>
        </div>
      </article>
    );
  }

  return (
    <article className="panel stack">
      <div>
        <h2 className="panel-title">Manual payouts</h2>
        <p className="muted">
          This deployment uses administrator-led payouts. Your balance stays here until an admin records a payout after coordinating payout details with you.
        </p>
      </div>
      <div className="card stack stack-gap-8">
        <strong>Balances</strong>
        <span className="muted">Available: {formatCurrency(summary.availableAmount, summary.currency)}</span>
        <span className="muted">Pending settlement: {formatCurrency(summary.pendingSettlementAmount, summary.currency)}</span>
      </div>
    </article>
  );
}

export function CreatorWithdrawalHistorySection({ withdrawals }: { withdrawals: WithdrawalRequest[] }) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="panel-title">Withdrawal history</h2>
        <p className="muted">Each withdrawal shows its current status (pending, paid, or rejected).</p>
      </div>
      {withdrawals.length === 0 ? (
        <div className="empty-state">No withdrawals yet.</div>
      ) : (
        withdrawals.map((withdrawal) => (
          <div key={withdrawal.id} className="card">
            <div className="panel-header">
              <div>
                <strong>{formatCurrency(withdrawal.amount, withdrawal.currency)}</strong>
                <p className="muted">{withdrawal.payoutMethodSnapshot}</p>
              </div>
              <span className="tag">{withdrawal.status}</span>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function CreatorCoursesOverview({ courses }: { courses: CourseOverview[] }) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="panel-title">Your courses</h2>
        <p className="muted">
          Premium pricing lives at the course level, premium locks live at the node level, and learner entitlements renew
          in fixed day windows.
        </p>
      </div>

      {courses.length === 0 ? (
        <div className="empty-state">No courses yet. Create your first course.</div>
      ) : (
        courses.map((course) => (
          <div key={course.id} className="card">
            <div className="panel-header">
              <div>
                <h3 className="panel-title">{course.title}</h3>
                <p className="muted">{course.description}</p>
                <div className="inline premium-badge-row creator-course-badges">
                  <span className={`studio-badge ${course.ownershipType === 'collaborator' ? 'studio-badge-warning' : 'studio-badge-success'}`}>
                    {course.ownershipType === 'collaborator' ? 'Collaborating' : 'Owned'}
                  </span>
                  <span className="studio-badge studio-badge-muted">
                    {course.moduleCount} module{course.moduleCount === 1 ? '' : 's'}
                  </span>
                  <span className="studio-badge studio-badge-muted">
                    {course.nodeCount} node{course.nodeCount === 1 ? '' : 's'}
                  </span>
                </div>
              </div>
              <div className="inline">
                <Link href={`/creator/courses/${course.id}/modules`} className="button button-secondary">
                  Modules
                </Link>
                {course.ownershipType !== 'collaborator' ? (
                  <>
                    <Link href={`/creator/courses/${course.id}/account`} className="button button-ghost">
                      Account
                    </Link>
                    <Link href={`/creator/courses/${course.id}/edit`} className="button button-ghost">
                      Edit
                    </Link>
                  </>
                ) : null}
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function CreatorSalesOverview({ sales }: { sales: CreatorPremiumSale[] }) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="panel-title">Premium sales</h2>
        <p className="muted">
          Verified premium purchases credit your wallet net of platform fee and create or extend learner entitlements
          automatically.
        </p>
      </div>
      {sales.length === 0 ? (
        <div className="empty-state">No premium sales yet.</div>
      ) : (
        sales.map((sale) => (
          <div key={sale.purchaseId} className="card">
            <div className="panel-header">
              <div className="stack stack-gap-8">
                <div className="inline premium-badge-row">
                  <span className="studio-badge studio-badge-primary">{sale.purchaseKind}</span>
                  <span className="studio-badge studio-badge-muted">{sale.paymentStatus}</span>
                  <span className="studio-badge studio-badge-muted">{sale.courseTitle}</span>
                </div>
                <strong>{sale.learnerName ?? sale.learnerUserId}</strong>
                <p className="muted text-no-margin">
                  Gross {formatCurrency(sale.grossAmount, sale.currency)} · Platform fee{' '}
                  {formatCurrency(sale.platformFeeAmount, sale.currency)} · Creator net{' '}
                  {formatCurrency(sale.creatorNetAmount, sale.currency)}
                </p>
              </div>
              <div className="stack stack-gap-6 text-align-end">
                <strong>{formatCurrency(sale.creatorNetAmount, sale.currency)}</strong>
                <span className="muted">
                  {sale.accessExpiresAt
                    ? `Access expires ${formatDateTimeLabel(sale.accessExpiresAt)}`
                    : sale.paidAt
                      ? `Paid ${formatDateTimeLabel(sale.paidAt)}`
                      : 'Awaiting payment'}
                </span>
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}

export function CreatorCertificatesOverview({ certificates }: { certificates: CreatorCourseCertificateSummary[] }) {
  return (
    <section className="panel stack">
      <div>
        <h2 className="panel-title">Certificates</h2>
        <p className="muted">
          Certificate templates live in the rebuilt schema only. Issuance stays tied to the active course, quiz attempts,
          and entitlement-aware access model.
        </p>
      </div>
      {certificates.length === 0 ? (
        <div className="empty-state">No course certificate templates are configured yet.</div>
      ) : (
        certificates.map((entry) => (
          <div key={entry.courseId} className="card">
            <div className="panel-header">
              <div className="stack stack-gap-8">
                <div className="inline premium-badge-row">
                  <span
                    className={`studio-badge ${entry.templateActive ? 'studio-badge-success' : 'studio-badge-warning'}`}
                  >
                    {entry.templateActive ? 'Template active' : 'Template missing'}
                  </span>
                  <span className="studio-badge studio-badge-muted">{entry.issuedCount} issued</span>
                </div>
                <strong>{entry.courseTitle}</strong>
                <p className="muted text-no-margin">
                  {entry.templateTitle ?? 'No active certificate template yet.'}
                </p>
              </div>
              <div className="inline premium-badge-row">
                <Link href={`/creator/courses/${entry.courseId}/account`} className="button button-secondary">
                  Manage settings
                </Link>
                <Link href={`/creator/courses/${entry.courseId}/modules`} className="button button-ghost">
                  Open modules
                </Link>
              </div>
            </div>
          </div>
        ))
      )}
    </section>
  );
}


