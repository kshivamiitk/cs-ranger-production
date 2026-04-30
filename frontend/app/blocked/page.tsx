import Link from 'next/link';

import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { getServerViewerContext } from '@/src/presentation/serverPage';

export default async function BlockedPage() {
  const { viewer } = await getServerViewerContext();

  return (
    <main className="auth-shell">
      <section className="auth-card stack-lg">
        <div className="auth-brand-lockup">
          <BrandSymbol size="lg" />
          <div className="stack" style={{ gap: 8 }}>
            <span className="tag">CS Ranger</span>
            <h1 className="headline">Account blocked</h1>
            <p className="subheadline" style={{ margin: 0 }}>
              This account has been blocked from normal learner, creator, and admin flows. Sign out or contact the platform owner directly if you need a review.
            </p>
          </div>
        </div>
        <div className="inline">
          <Link href="/login" className="button button-secondary">Back to login</Link>
          {viewer ? (
            <form action="/api/auth/signout" method="post">
              <button className="button" type="submit">Sign out</button>
            </form>
          ) : null}
        </div>
      </section>
    </main>
  );
}


