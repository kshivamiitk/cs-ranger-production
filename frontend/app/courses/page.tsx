import { BookOpen, GraduationCap, Layers3, Sparkles, Star, Users } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CatalogCourseSections } from '@/components/catalog/CatalogCourseSections';
import { getServerPageContext } from '@/src/presentation/serverPage';
import { describeCoursePremiumState } from '@/src/presentation/coursePremium';

function compactNumber(value: number) {
  if (value >= 1000) {
    return `${(value / 1000).toFixed(value >= 10000 ? 0 : 1)}k`;
  }

  return String(value);
}

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { viewer, themeMode, container } = await getServerPageContext();
  const { catalogService } = container;
  const courses = await catalogService.listPublishedCourses(viewer);
  const premiumCourses = courses.filter((course) => describeCoursePremiumState(course, course.premiumNodeCount).state !== 'free');
  const totalNodes = courses.reduce((sum, course) => sum + course.nodeCount, 0);
  const totalLearners = courses.reduce((sum, course) => sum + course.engagement.activeLearnerCount, 0);
  const ratedCourses = courses.filter((course) => course.engagement.totalReviews > 0);
  const averageRating =
    ratedCourses.length > 0
      ? ratedCourses.reduce((sum, course) => sum + course.engagement.averageRating, 0) / ratedCourses.length
      : 0;
  const domains = Array.from(
    new Map(
      courses
        .filter((course) => course.domainSlug && course.domainName)
        .map((course) => [course.domainSlug, course.domainName] as const)
    ).values()
  ).slice(0, 4);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Premium Course Catalog"
      subtitle="Fast indexed course access with clear premium states, aligned learning cards, and a focused workspace for every module tree."
      hideHeader
    >
      <section className="catalog-premium-hero">
        <div className="catalog-premium-hero-copy">
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">
              <Sparkles size={14} />
              Fast access catalog
            </span>
            <span className="studio-badge studio-badge-muted">{courses.length} live courses</span>
            <span className="studio-badge studio-badge-muted">{premiumCourses.length} premium tracks</span>
          </div>
          <div>
            <h2>Choose a course from a cleaner, studio-grade shelf.</h2>
            <p>
              Every course card now keeps access, progress, ratings, modules, and creator context aligned so learners can scan quickly and open the right workspace.
            </p>
          </div>
          {domains.length > 0 ? (
            <div className="catalog-premium-domain-row" aria-label="Featured course domains">
              {domains.map((domain) => (
                <span key={domain}>{domain}</span>
              ))}
            </div>
          ) : null}
        </div>

        <div className="catalog-premium-metrics" aria-label="Catalog summary">
          <article>
            <GraduationCap size={18} />
            <strong>{compactNumber(courses.length)}</strong>
            <span>Published courses</span>
          </article>
          <article>
            <BookOpen size={18} />
            <strong>{compactNumber(totalNodes)}</strong>
            <span>Readable nodes</span>
          </article>
          <article>
            <Users size={18} />
            <strong>{compactNumber(totalLearners)}</strong>
            <span>Active learners</span>
          </article>
          <article>
            <Star size={18} />
            <strong>{averageRating > 0 ? averageRating.toFixed(1) : 'New'}</strong>
            <span>Avg. rating</span>
          </article>
          <article>
            <Layers3 size={18} />
            <strong>{compactNumber(courses.reduce((sum, course) => sum + course.moduleCount, 0))}</strong>
            <span>Modules</span>
          </article>
        </div>
      </section>

      <section className="catalog-premium-section">
        {courses.length === 0 ? (
          <div className="empty-state">No published courses exist yet.</div>
        ) : (
          <CatalogCourseSections
            courses={courses}
            pathname="/courses"
            searchParams={resolvedSearchParams}
            viewerIsLoggedIn={Boolean(viewer)}
            title="All courses"
            description="Use the filters to narrow courses instantly by domain, pricing, access, and ranking."
          />
        )}
      </section>
    </AppShell>
  );
}
