import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { formatDateLabel } from '@/lib/utils';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { requireServerCreator } from '@/src/presentation/serverPage';

export default async function CreatorLearnerDoubtsPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { creatorLearnerDoubtQueryService }] = await Promise.all([
    requireServerCreator('/creator/learner-doubts'),
    createServerContainer(),
  ]);
  const doubts = await creatorLearnerDoubtQueryService.listCreatorLearnerDoubts(viewer);
  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedDoubts = paginateList(doubts, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      eyebrow="Creator Studio"
      title="Doubts"
      subtitle="Open top-level comments tagged as doubt in your courses. Resolve when answered to keep this queue clean."
    >
      <section className="panel stack creator-doubts-panel">
        <ListPaginationControls
          pathname="/creator/learner-doubts"
          searchParams={resolvedSearchParams}
          page={pagedDoubts.page}
          size={pagedDoubts.size}
          totalItems={pagedDoubts.totalItems}
          totalPages={pagedDoubts.totalPages}
          startIndex={pagedDoubts.startIndex}
          endIndex={pagedDoubts.endIndex}
          noun="doubts"
        />
        {doubts.length === 0 ? (
          <div className="empty-state">No open doubts right now.</div>
        ) : (
          <div className="stack">
            {pagedDoubts.items.map((doubt) => (
              <article key={doubt.commentId} className="card stack learner-doubt-card">
                <div className="panel-header learner-doubt-header">
                  <div className="stack learner-doubt-copy" style={{ gap: 6 }}>
                    <div className="inline premium-badge-row">
                      <span className="studio-badge studio-badge-warning">Unresolved doubt</span>
                      <span className="studio-badge studio-badge-muted">{doubt.courseTitle}</span>
                      <span className="studio-badge studio-badge-muted">{doubt.nodeTitle}</span>
                    </div>
                    <strong>{doubt.learnerName ?? doubt.learnerUserId}</strong>
                    <p className="muted learner-doubt-body" style={{ margin: 0 }}>{doubt.commentBody}</p>
                  </div>
                  <div className="stack learner-doubt-actions" style={{ gap: 8, alignItems: 'flex-end' }}>
                    <span className="tag">Active {formatDateLabel(doubt.lastActivityAt)}</span>
                    <Link
                      href={`/courses/${doubt.courseId}/nodes/${doubt.nodeId}#discussion-comment-${doubt.commentId}`}
                      className="button button-secondary"
                    >
                      Open comment
                    </Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </AppShell>
  );
}


