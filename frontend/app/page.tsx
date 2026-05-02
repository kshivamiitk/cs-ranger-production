import Link from 'next/link';
import { redirect } from 'next/navigation';
import { ArrowRight, BookOpen, GraduationCap, Palette, ShieldCheck, Sparkles, WalletCards } from 'lucide-react';

import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { getServerViewerContext } from '@/src/presentation/serverPage';

const featureCards = [
  {
    icon: GraduationCap,
    title: 'Cinematic learning shelves',
    copy: 'Course cards now feel premium, visual, access-aware, and progress-aware from the first glance.',
  },
  {
    icon: WalletCards,
    title: 'Creator-grade studio surfaces',
    copy: 'Dashboards, authoring routes, certificates, pricing, and collaboration pages now share one coherent product language.',
  },
  {
    icon: ShieldCheck,
    title: 'Code-editor course cockpit',
    copy: 'Modules and nodes are presented as a calm expandable learning tree with premium state, progress, and next-step clarity.',
  },
] as const;

const viewModes = [
  'Light studio',
  'Dark focus',
  'Ocean',
  'Forest',
  'Ember · Claude-inspired',
] as const;

export default async function HomePage() {
  const { viewer } = await getServerViewerContext();

  if (viewer) {
    redirect('/dashboard');
  }

  return (
    <main className="marketing-shell marketing-shell-v4">
      <section className="marketing-hero marketing-hero-v4">
        <div className="marketing-hero-copy">
          <div className="inline premium-badge-row">
            <BrandSymbol size="md" />
            <span className="tag">CS Ranger v1.0</span>
            <span className="studio-badge studio-badge-muted">Production learning operating system</span>
          </div>
          <div className="stack" style={{ gap: 16 }}>
            <h1 className="headline marketing-v4-title" style={{ margin: 0 }}>
              A premium, dynamic learning workspace that feels cinematic, structured, and serious from the first screen.
            </h1>
            <p className="subheadline marketing-v4-copy" style={{ margin: 0 }}>
              Version 1.0 brings the polished learner workspace, creator studio, premium access controls, fast course APIs, and deployment-ready testing scripts into one stable release.
            </p>
          </div>
          <div className="inline marketing-hero-actions">
            <Link href="/courses" className="button">
              Explore courses
              <ArrowRight size={16} />
            </Link>
            <Link href="/search" className="button button-secondary">
              <BookOpen size={16} />
              Search the catalog
            </Link>
            <Link href="/login" className="button button-ghost">
              Sign in
            </Link>
          </div>
          <div className="marketing-view-mode-row">
            {viewModes.map((mode) => (
              <span key={mode} className="studio-badge studio-badge-muted">
                <Palette size={14} />
                {mode}
              </span>
            ))}
          </div>
        </div>

        <div className="marketing-hero-panel marketing-hero-panel-conversation">
          <div className="claude-style-note">
            <span className="section-label">v1.0 production system</span>
            <p>Fast indexed APIs, HTML/CSS/JS runtime, PDF reading, test reports, and consistent premium surfaces.</p>
          </div>
          <div className="marketing-conversation-stack">
            <article className="marketing-conversation-bubble marketing-conversation-bubble-user">
              <strong>Creator Studio</strong>
              <span>Cleaner authoring, stronger cards, clearer course actions, and studio-like settings surfaces.</span>
            </article>
            <article className="marketing-conversation-bubble marketing-conversation-bubble-system">
              <strong>Learner Home</strong>
              <span>Continue learning, premium access, streaks, feed, bookmarks, and certificates inside one bento dashboard.</span>
            </article>
          </div>
        </div>
      </section>

      <section className="marketing-feature-grid">
        {featureCards.map((card) => {
          const Icon = card.icon;
          return (
            <article key={card.title} className="marketing-feature-card">
              <div className="marketing-feature-icon">
                <Icon size={20} />
              </div>
              <div className="stack" style={{ gap: 8 }}>
                <h2 className="panel-title" style={{ margin: 0 }}>{card.title}</h2>
                <p className="muted" style={{ margin: 0 }}>{card.copy}</p>
              </div>
            </article>
          );
        })}
      </section>
    </main>
  );
}
