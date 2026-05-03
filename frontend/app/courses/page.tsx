import { AppShell } from '@/components/app-shell/AppShell';
import { CatalogCourseSections } from '@/components/catalog/CatalogCourseSections';
import { getServerPageContext } from '@/src/presentation/serverPage';

export default async function CoursesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const { viewer, themeMode, container } = await getServerPageContext();
  const { catalogService } = container;
  const courses = await catalogService.listPublishedCourses(viewer);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Premium Course Catalog"
      subtitle="Fast indexed course access with clear premium states, aligned learning cards, and a focused workspace for every module tree."
      hideHeader
    >
      <section className="catalog-premium-section catalog-premium-section-flush">
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
