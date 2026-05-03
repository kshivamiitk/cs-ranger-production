type LoadingVariant =
  | 'default'
  | 'admin'
  | 'course'
  | 'course-reader'
  | 'creator'
  | 'dashboard'
  | 'search';

const loadingCopy: Record<LoadingVariant, { eyebrow: string; title: string; subtitle: string }> = {
  default: {
    eyebrow: 'CS Ranger',
    title: 'Loading your workspace',
    subtitle: 'Fetching the latest data and preparing the page.',
  },
  admin: {
    eyebrow: 'Admin Console',
    title: 'Loading operations data',
    subtitle: 'Preparing admin metrics, queues, and moderation context.',
  },
  course: {
    eyebrow: 'Course Workspace',
    title: 'Loading course content',
    subtitle: 'Fetching modules, nodes, progress, and access status.',
  },
  'course-reader': {
    eyebrow: 'Focused Reader',
    title: 'Opening the lesson',
    subtitle: 'Loading node payload, navigation, bookmarks, and progress.',
  },
  creator: {
    eyebrow: 'Creator Studio',
    title: 'Loading studio workspace',
    subtitle: 'Preparing course, module, finance, and collaboration data.',
  },
  dashboard: {
    eyebrow: 'Learner Workspace',
    title: 'Loading your dashboard',
    subtitle: 'Fetching progress, courses, bookmarks, and activity signals.',
  },
  search: {
    eyebrow: 'Discovery',
    title: 'Loading results',
    subtitle: 'Fetching matching courses, modules, nodes, and creators.',
  },
};

function SkeletonLine(props: { size?: 'sm' | 'md' | 'lg'; className?: string }) {
  return <span className={`route-loading-skeleton route-loading-skeleton-${props.size ?? 'md'} ${props.className ?? ''}`} />;
}

export function AppRouteLoading({ variant = 'default' }: { variant?: LoadingVariant }) {
  const copy = loadingCopy[variant];

  return (
    <main className="route-loading-shell" aria-busy="true" aria-live="polite">
      <section className="route-loading-topbar" aria-hidden="true">
        <div className="route-loading-brand">
          <span className="route-loading-logo">CS</span>
          <SkeletonLine size="sm" className="route-loading-brand-line" />
        </div>
        <div className="route-loading-nav">
          <SkeletonLine size="sm" />
          <SkeletonLine size="sm" />
          <SkeletonLine size="sm" />
        </div>
      </section>

      <section className="route-loading-hero" role="status">
        <div className="section-label route-loading-eyebrow">
          <span className="route-loading-live-dot" />
          {copy.eyebrow}
        </div>
        <h1>{copy.title}</h1>
        <p>{copy.subtitle}</p>
        <div className="route-loading-progress" aria-hidden="true">
          <span />
        </div>
      </section>

      <section className="route-loading-content" aria-hidden="true">
        <aside className="route-loading-panel route-loading-side-panel">
          <SkeletonLine size="md" />
          <SkeletonLine size="sm" />
          <SkeletonLine size="sm" />
          <SkeletonLine size="lg" />
        </aside>

        <div className="route-loading-panel route-loading-main-panel">
          <SkeletonLine size="lg" />
          <SkeletonLine size="md" />
          <div className="route-loading-card-grid">
            <span />
            <span />
            <span />
            <span />
          </div>
        </div>
      </section>
    </main>
  );
}
