import { Compass, LockKeyhole, Sparkles, TrendingUp } from 'lucide-react';

import { AuthForm } from '@/components/auth/AuthForm';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { AdminIntroCardPreview } from '@/components/admin/AdminIntroCardPreview';
import { safeNextPath } from '@/src/presentation/http/routeUtils';
import { getActiveAdminIntroCard } from '@/src/server/adminIntro';

const trustPoints = [
  {
    icon: Compass,
    title: 'Structured learning paths',
    copy: 'Move from overview to node-level depth through a clean, focused course workspace.',
  },
  {
    icon: Sparkles,
    title: 'Creator-grade production flow',
    copy: 'Build, preview, and publish in one system designed for polished knowledge delivery.',
  },
  {
    icon: LockKeyhole,
    title: 'Access-aware premium controls',
    copy: 'Free and premium experiences stay consistent with role-aware guards and entitlement checks.',
  },
] as const;

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextValue = resolvedSearchParams.next;
  const nextPath = safeNextPath(typeof nextValue === 'string' ? nextValue : null);
  const adminIntroCard = await getActiveAdminIntroCard().catch(() => null);

  return (
    <main className="auth-shell">
      <section className="auth-page-shell">
        <section className="auth-story-panel" aria-labelledby="auth-story-title">
          <div className="auth-story-top">
            <BrandSymbol size="lg" />
            <div className="stack auth-story-stack-gap">
              <span className="tag auth-story-tag">CS Ranger Platform</span>
              <h1 className="headline auth-story-title" id="auth-story-title">
                Premium learning and creator workflows, in one controlled surface.
              </h1>
              <p className="subheadline auth-story-copy">
                Continue into a focused environment built for structured study, high-signal authoring, and access-aware premium delivery.
              </p>
            </div>
          </div>

          <div className="auth-story-metrics" aria-label="Platform highlights">
            <article className="auth-metric-card">
              <span className="auth-metric-value">Unified</span>
              <span className="auth-metric-label">Learner and creator surfaces</span>
            </article>
            <article className="auth-metric-card">
              <span className="auth-metric-value">
                <TrendingUp size={16} aria-hidden="true" /> Premium-ready
              </span>
              <span className="auth-metric-label">Free and paid access under one model</span>
            </article>
          </div>

          <div className="auth-trust-grid">
            {trustPoints.map((point) => {
              const Icon = point.icon;

              return (
                <article key={point.title} className="auth-trust-card">
                  <div className="auth-trust-icon" aria-hidden="true">
                    <Icon size={18} />
                  </div>
                  <div className="stack stack-gap-8">
                    <h2 className="auth-trust-title">{point.title}</h2>
                    <p className="auth-trust-copy">{point.copy}</p>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="auth-founder-note">
            <div className="section-label">From the team</div>
            <p className="auth-founder-copy">
              Every session starts in a premium shell so the learning and publishing experience feels intentional from the first click.
            </p>
          </div>

          {adminIntroCard ? (
            <AdminIntroCardPreview
              card={{
                title: adminIntroCard.title,
                body: adminIntroCard.body,
                imageUrl: adminIntroCard.imageUrl ?? '',
                imageFocus: adminIntroCard.imageFocus,
                ctaLabel: adminIntroCard.ctaLabel ?? '',
                ctaHref: adminIntroCard.ctaHref ?? '',
                isActive: adminIntroCard.isActive,
              }}
            />
          ) : null}
        </section>

        <section className="auth-form-panel-shell">
          <AuthForm nextPath={nextPath} />
        </section>
      </section>
    </main>
  );
}


