import Link from 'next/link';
import { Search as SearchIcon } from 'lucide-react';

import { AppShell } from '@/components/app-shell/AppShell';
import { CatalogCourseSections } from '@/components/catalog/CatalogCourseSections';
import { CreatorProfileCard } from '@/components/creators/CreatorProfileCard';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { Input } from '@/components/ui/Input';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { getServerPageContext } from '@/src/presentation/serverPage';

const filters = [
  { key: 'all', label: 'All' },
  { key: 'courses', label: 'Courses' },
  { key: 'modules', label: 'Modules' },
  { key: 'nodes', label: 'Nodes' },
  { key: 'creators', label: 'Creators' },
] as const;

type FilterKey = (typeof filters)[number]['key'];

export default async function SearchPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const q = typeof resolvedSearchParams.q === 'string' ? resolvedSearchParams.q.trim() : '';
  const filter = typeof resolvedSearchParams.filter === 'string' ? (resolvedSearchParams.filter as FilterKey) : 'all';
  const { viewer, themeMode, container } = await getServerPageContext();
  const { searchService } = container;
  const results = q ? await searchService.searchEverything(q, viewer) : { query: '', courses: [], modules: [], nodes: [], creators: [] };
  const pagination = resolveListPagination(resolvedSearchParams, { size: 25 });

  const flatResults = [
    ...results.courses.map((course) => ({ type: 'courses' as const, id: course.id })),
    ...results.modules.map((module) => ({ type: 'modules' as const, id: module.id })),
    ...results.nodes.map((node) => ({ type: 'nodes' as const, id: node.id })),
    ...results.creators.map((creator) => ({ type: 'creators' as const, id: creator.userId })),
  ].filter((entry) => filter === 'all' || entry.type === filter);
  const paged = paginateList(flatResults, pagination.page, pagination.size);
  const pagedSet = new Set(paged.items.map((entry) => `${entry.type}:${entry.id}`));

  const pagedCourses = results.courses.filter((entry) => pagedSet.has(`courses:${entry.id}`));
  const pagedModules = results.modules.filter((entry) => pagedSet.has(`modules:${entry.id}`));
  const pagedNodes = results.nodes.filter((entry) => pagedSet.has(`nodes:${entry.id}`));
  const pagedCreators = results.creators.filter((entry) => pagedSet.has(`creators:${entry.userId}`));

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Search"
      subtitle="Search published courses, visible modules and nodes, plus public creator pages from one real searchable workspace."
    >
      <section className="stack-lg search-page-shell">
        <section className="panel stack-lg search-input-panel">
          <div className="inline premium-badge-row search-header-row">
            <span className="studio-badge studio-badge-primary">
              <SearchIcon size={14} />
              Unified search
            </span>
            {q ? <span className="studio-badge studio-badge-muted">{flatResults.length} result{flatResults.length === 1 ? '' : 's'}</span> : null}
          </div>

          <form action="/search" method="get" className="search-toolbar">
            <label className="search-input-shell" aria-label="Search courses, modules, nodes, or creators">
              <SearchIcon size={18} />
              <Input
                name="q"
                defaultValue={q}
                placeholder="Search courses, creators, modules, or nodes"
                className="search-page-input"
              />
            </label>
            <input type="hidden" name="filter" value={filter} />
            <button type="submit" className="button">Search</button>
          </form>

          <div className="inline premium-badge-row search-filter-row">
            {filters.map((entry) => (
              <Link
                key={entry.key}
                href={q ? `/search?q=${encodeURIComponent(q)}${entry.key === 'all' ? '' : `&filter=${entry.key}`}` : `/search${entry.key === 'all' ? '' : `?filter=${entry.key}`}`}
                className={`studio-badge ${filter === entry.key ? 'studio-badge-primary' : 'studio-badge-muted'}`}
              >
                {entry.label}
              </Link>
            ))}
          </div>
        </section>

        {!q ? (
          <div className="empty-state">Type a query above to search courses, modules, nodes, or creators.</div>
        ) : flatResults.length === 0 ? (
          <div className="empty-state">No results matched “{q}”. Try a broader query or switch filters.</div>
        ) : (
          <>
            <ListPaginationControls
              pathname="/search"
              searchParams={resolvedSearchParams}
              page={paged.page}
              size={paged.size}
              totalItems={paged.totalItems}
              totalPages={paged.totalPages}
              startIndex={paged.startIndex}
              endIndex={paged.endIndex}
              noun="results"
            />

            <div className="stack-lg">
              {(filter === 'all' || filter === 'courses') && pagedCourses.length > 0 ? (
                <section className="panel stack-lg">
                  <div>
                    <h2 className="panel-title">Courses</h2>
                    <p className="muted">Published catalog results with access-aware tree entry points.</p>
                  </div>
                  <CatalogCourseSections courses={pagedCourses} />
                </section>
              ) : null}

              {(filter === 'all' || filter === 'modules') && pagedModules.length > 0 ? (
                <section className="panel stack-lg">
                  <div>
                    <h2 className="panel-title">Modules</h2>
                    <p className="muted">These modules are searchable only when the viewer can access their course content.</p>
                  </div>
                  <div className="stack">
                    {pagedModules.map((module) => (
                      <Link key={module.id} href={`/courses/${module.courseId}#module-${module.id}`} className="card search-result-card">
                        <div className="inline premium-badge-row">
                          <span className="studio-badge studio-badge-primary">Module {module.position}</span>
                          <span className="studio-badge studio-badge-muted">{module.courseTitle}</span>
                        </div>
                        <h3 className="panel-title" style={{ margin: '12px 0 0' }}>{module.title}</h3>
                        <p className="muted" style={{ margin: '8px 0 0' }}>{module.summary}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {(filter === 'all' || filter === 'nodes') && pagedNodes.length > 0 ? (
                <section className="panel stack-lg">
                  <div>
                    <h2 className="panel-title">Nodes</h2>
                    <p className="muted">Node results open directly into the standalone reader route with the course explorer visible on the left.</p>
                  </div>
                  <div className="stack">
                    {pagedNodes.map((node) => (
                      <Link key={node.id} href={`/courses/${node.courseId}/nodes/${node.id}`} className="card search-result-card">
                        <div className="inline premium-badge-row">
                          <span className="studio-badge studio-badge-primary">{node.type}</span>
                          <span className="studio-badge studio-badge-muted">{node.courseTitle}</span>
                          <span className="studio-badge studio-badge-muted">Module {node.modulePosition}</span>
                        </div>
                        <h3 className="panel-title" style={{ margin: '12px 0 0' }}>{node.title}</h3>
                        <p className="muted" style={{ margin: '8px 0 0' }}>{node.snippet}</p>
                      </Link>
                    ))}
                  </div>
                </section>
              ) : null}

              {(filter === 'all' || filter === 'creators') && pagedCreators.length > 0 ? (
                <section className="panel stack-lg">
                  <div>
                    <h2 className="panel-title">Creators</h2>
                    <p className="muted">Open public creator pages and follow them from the same active architecture.</p>
                  </div>
                  <div className="stack">
                    {pagedCreators.map((creator) => (
                      <CreatorProfileCard
                        key={creator.userId}
                        creator={{
                          userId: creator.userId,
                          fullName: creator.fullName,
                          username: creator.username ?? null,
                          primaryRole: 'creator',
                          profilePhotoUrl: creator.profilePhotoUrl,
                          bio: creator.bio,
                          isBanned: false,
                        }}
                        follow={{
                          creatorUserId: creator.userId,
                          followerCount: creator.followerCount,
                          viewerIsFollowing: creator.viewerIsFollowing,
                        }}
                        viewerUserId={viewer?.user.id ?? null}
                        eyebrow="Creator result"
                        compact
                        showBio
                      />
                    ))}
                  </div>
                </section>
              ) : null}
            </div>
          </>
        )}
      </section>
    </AppShell>
  );
}

