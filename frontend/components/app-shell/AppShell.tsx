'use client';

import type { PropsWithChildren, ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ArrowLeft, Sparkles } from 'lucide-react';

import type { ThemeMode, Viewer } from '@/src/domain/models';
import { Button } from '@/components/ui/Button';
import { TopNavbar } from '@/components/app-shell/TopNavbar';
import { resolveAppShellMode } from '@/src/presentation/appNavigation';

function shellEyebrow(mode: ReturnType<typeof resolveAppShellMode>, fallback?: string) {
  if (fallback) return fallback;
  if (mode === 'creator') return 'Creator Studio';
  if (mode === 'admin') return 'Admin Command Center';
  return 'Learner Workspace';
}

export function AppShell(props: PropsWithChildren<{
  viewer: Viewer | null;
  eyebrow?: string;
  themeMode: ThemeMode;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  headerVariant?: 'hero' | 'compact';
  hideHeader?: boolean;
  unreadCounts?: {
    feed?: number;
    support?: number;
    notifications?: number;
  };
}>) {
  const pathname = usePathname() ?? '/';
  const shellMode = resolveAppShellMode(pathname);
  const showBackToLearnerDashboard = props.viewer !== null && (shellMode === 'creator' || shellMode === 'admin');
  const compact = props.headerVariant === 'compact';

  return (
    <div className="dashboard-shell dashboard-shell-v7 dashboard-shell-v226" data-navbar-mode={shellMode}>
      <div className="shell-backdrop shell-backdrop-v226" />
      <TopNavbar viewer={props.viewer} themeMode={props.themeMode} unreadCounts={props.unreadCounts} />

      <main className="shell-surface shell-surface-v7 shell-surface-v226">
        <div className="workspace-frame workspace-frame-v7 workspace-frame-v226">
          <div className="page-shell workspace-shell workspace-shell-v226">
            {props.hideHeader ? null : (
              <header className={`hero-panel workspace-header-surface workspace-header-surface-v226${compact ? ' workspace-header-surface-compact' : ''}`}>
                <div className="v226-hero-orb v226-hero-orb-one" aria-hidden="true" />
                <div className="v226-hero-orb v226-hero-orb-two" aria-hidden="true" />

                <div className="hero-panel-copy v226-hero-copy">
                  <div className="workspace-header-topline v226-header-topline">
                    <div className="section-label v226-section-label">{shellEyebrow(shellMode, props.eyebrow)}</div>
                    <span className="v226-release-chip">
                      <Sparkles size={13} />
                      v1.0 production
                    </span>
                  </div>
                  <div className="hero-panel-title-block v226-title-block">
                    <h1 className={compact ? 'panel-title workspace-header-compact-title v226-page-title is-compact' : 'headline v226-page-title'}>
                      {props.title}
                    </h1>
                    {props.subtitle ? <p className="subheadline v226-page-subtitle">{props.subtitle}</p> : null}
                  </div>
                </div>

                <div className="hero-actions shell-header-actions v226-shell-header-actions">
                  {showBackToLearnerDashboard || props.actions ? (
                    <div className="hero-actions-inline v226-header-actions-inline">
                      {showBackToLearnerDashboard ? (
                        <Link href="/dashboard" className="button button-ghost v226-back-link">
                          <ArrowLeft size={15} />
                          Learner home
                        </Link>
                      ) : null}
                      {props.actions}
                    </div>
                  ) : null}
                </div>
              </header>
            )}

            <div className="content-shell content-shell-v226">
              {props.viewer?.profile.isBanned ? (
                <section className="panel stack-lg blocked-workspace-panel v226-blocked-panel">
                  <div className="section-label">Account blocked</div>
                  <div className="stack v226-blocked-copy">
                    <h2 className="panel-title">This account cannot use CS Ranger right now.</h2>
                    <p className="muted">
                      An administrator has blocked this account from normal learner, creator, and admin flows. Contact support if you need the decision reviewed.
                    </p>
                  </div>
                  <div className="inline premium-badge-row">
                    <a href="/blocked" className="button button-secondary">Blocked status</a>
                    <form action="/api/auth/signout" method="post">
                      <Button type="submit" variant="ghost">Sign out</Button>
                    </form>
                  </div>
                </section>
              ) : (
                props.children
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
