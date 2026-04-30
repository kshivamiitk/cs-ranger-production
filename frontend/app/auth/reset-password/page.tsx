import { ShieldCheck } from 'lucide-react';
import Link from 'next/link';

import { ResetPasswordForm } from '@/components/auth/ResetPasswordForm';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { safeNextPath } from '@/src/presentation/http/routeUtils';

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolved = await searchParams;
  const nextPath = safeNextPath(typeof resolved.next === 'string' ? resolved.next : null);

  return (
    <main className="auth-shell">
      <section className="auth-page-shell">
        <section className="auth-story-panel" aria-labelledby="reset-story-title">
          <div className="auth-story-top">
            <BrandSymbol size="lg" />
            <div className="stack" style={{ gap: 10 }}>
              <span className="tag auth-story-tag">Secure session</span>
              <h1 className="headline auth-story-title" id="reset-story-title">
                You are signed in for this reset only.
              </h1>
              <p className="subheadline auth-story-copy">
                Complete this step to set a new password. If you did not request a reset, close this tab and your password
                stays unchanged until you use the link.
              </p>
            </div>
          </div>

          <div className="auth-trust-grid">
            <article className="auth-trust-card">
              <div className="auth-trust-icon" aria-hidden="true">
                <ShieldCheck size={18} />
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <h2 className="auth-trust-title">Use at least 8 characters</h2>
                <p className="auth-trust-copy">Mix letters, numbers, and symbols. Avoid reusing passwords from other sites.</p>
              </div>
            </article>
          </div>

          <div className="auth-founder-note">
            <div className="section-label">After saving</div>
            <p className="auth-founder-copy">
              You will be redirected to{' '}
              <Link href={nextPath} style={{ textDecoration: 'underline' }}>
                continue in the app
              </Link>
              .
            </p>
          </div>
        </section>

        <section className="auth-form-panel-shell">
          <ResetPasswordForm nextPath={nextPath} />
        </section>
      </section>
    </main>
  );
}


