import { LockKeyhole } from 'lucide-react';
import Link from 'next/link';

import { ForgotPasswordForm } from '@/components/auth/ForgotPasswordForm';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { safeNextPath } from '@/src/presentation/http/routeUtils';

export default async function ForgotPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const nextPath = safeNextPath(typeof resolved.next === 'string' ? resolved.next : null);

  return (
    <main className="auth-shell">
      <section className="auth-page-shell">
        <section className="auth-story-panel" aria-labelledby="forgot-story-title">
          <div className="auth-story-top">
            <BrandSymbol size="lg" />
            <div className="stack" style={{ gap: 10 }}>
              <span className="tag auth-story-tag">CS Ranger Platform</span>
              <h1 className="headline auth-story-title" id="forgot-story-title">
                Reset access without losing your workspace.
              </h1>
              <p className="subheadline auth-story-copy">
                We email a single-use link that signs you in briefly so you can set a new password. The link expires for
                your security.
              </p>
            </div>
          </div>

          <div className="auth-trust-grid">
            <article className="auth-trust-card">
              <div className="auth-trust-icon" aria-hidden="true">
                <LockKeyhole size={18} />
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <h2 className="auth-trust-title">No password hints stored in email</h2>
                <p className="auth-trust-copy">
                  The reset link establishes a short recovery session. Your new password is never sent by email.
                </p>
              </div>
            </article>
          </div>

          <div className="auth-founder-note">
            <div className="section-label">Tip</div>
            <p className="auth-founder-copy">
              After updating your password you will return to{' '}
              <Link href={nextPath} style={{ textDecoration: 'underline' }}>
                your intended destination
              </Link>
              , or you can go back to{' '}
              <Link href={`/login?next=${encodeURIComponent(nextPath)}`} style={{ textDecoration: 'underline' }}>
                sign in
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="auth-form-panel-shell">
          <ForgotPasswordForm nextPath={nextPath} />
        </section>
      </section>
    </main>
  );
}


