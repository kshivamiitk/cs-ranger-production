import Link from 'next/link';

import { AppShell } from '@/components/app-shell/AppShell';
import { ListPaginationControls } from '@/components/ui/ListPaginationControls';
import { paginateList, resolveListPagination } from '@/lib/pagination';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { requireServerViewer } from '@/src/presentation/serverPage';

function percentage(score: number, maxScore: number) {
  if (maxScore <= 0) return 0;
  return Math.round((score / maxScore) * 100);
}

export default async function LearnerReportCardPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const [{ viewer, themeMode }, { authService }] = await Promise.all([
    requireServerViewer('/dashboard/report-card'),
    createServerContainer(),
  ]);
  await authService.requireViewer();
  const supabase = createServiceRoleSupabaseClient();

  const { data: attempts, error } = await supabase
    .from('quiz_attempts')
    .select('id, course_id, node_id, score, max_score, submitted_at')
    .eq('learner_user_id', viewer.user.id)
    .order('submitted_at', { ascending: false });

  if (error) {
    throw error;
  }

  const courseIds = [...new Set((attempts ?? []).map((entry) => entry.course_id))];
  const nodeIds = [...new Set((attempts ?? []).map((entry) => entry.node_id))];

  const [{ data: courses }, { data: nodes }] = await Promise.all([
    courseIds.length > 0 ? supabase.from('courses').select('id, title').in('id', courseIds) : Promise.resolve({ data: [] }),
    nodeIds.length > 0 ? supabase.from('course_nodes').select('id, title').in('id', nodeIds) : Promise.resolve({ data: [] }),
  ]);

  const courseTitleById = new Map((courses ?? []).map((entry) => [entry.id, entry.title]));
  const nodeTitleById = new Map((nodes ?? []).map((entry) => [entry.id, entry.title]));

  const grouped = new Map<string, Map<string, { bestScore: number; maxScore: number; attemptsCount: number; lastSubmittedAt: string | null }>>();

  for (const attempt of attempts ?? []) {
    if (!grouped.has(attempt.course_id)) grouped.set(attempt.course_id, new Map());
    const courseMap = grouped.get(attempt.course_id)!;
    const current = courseMap.get(attempt.node_id) ?? { bestScore: 0, maxScore: attempt.max_score, attemptsCount: 0, lastSubmittedAt: null };
    current.bestScore = Math.max(current.bestScore, attempt.score);
    current.maxScore = Math.max(current.maxScore, attempt.max_score);
    current.attemptsCount += 1;
    current.lastSubmittedAt = current.lastSubmittedAt ?? attempt.submitted_at;
    courseMap.set(attempt.node_id, current);
  }

  const rows = Array.from(grouped.entries()).map(([courseId, quizMap]) => {
    const quizzes = Array.from(quizMap.entries()).map(([nodeId, stats]) => ({
      nodeId,
      nodeTitle: nodeTitleById.get(nodeId) ?? 'Quiz node',
      percentage: percentage(stats.bestScore, stats.maxScore),
      ...stats,
    }));

    const averagePercentage = quizzes.length
      ? Math.round(quizzes.reduce((sum, quiz) => sum + quiz.percentage, 0) / quizzes.length)
      : 0;

    return {
      courseId,
      courseTitle: courseTitleById.get(courseId) ?? 'Course',
      averagePercentage,
      quizzes,
    };
  });

  const pagination = resolveListPagination(resolvedSearchParams);
  const pagedRows = paginateList(rows, pagination.page, pagination.size);

  return (
    <AppShell
      viewer={viewer}
      themeMode={themeMode}
      title="Report Card"
      subtitle="Best scores, attempt counts, and quiz-by-quiz progress across the courses you have studied."
      actions={<Link href="/dashboard" className="button button-secondary">Back to dashboard</Link>}
    >
      <section className="stack-lg report-card-grid">
        <div className="panel report-card-summary-panel">
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">Assessment summary</span>
            <span className="studio-badge studio-badge-muted">{(attempts ?? []).length} total attempt{(attempts ?? []).length === 1 ? '' : 's'}</span>
          </div>
          <div className="grid-3 report-card-kpis">
            <div className="card stack"><span className="field-label">Courses attempted</span><strong style={{ fontSize: '2rem' }}>{rows.length}</strong></div>
            <div className="card stack"><span className="field-label">Quizzes attempted</span><strong style={{ fontSize: '2rem' }}>{rows.reduce((sum, row) => sum + row.quizzes.length, 0)}</strong></div>
            <div className="card stack"><span className="field-label">Best course average</span><strong style={{ fontSize: '2rem' }}>{rows.length ? Math.max(...rows.map((row) => row.averagePercentage)) : 0}%</strong></div>
          </div>
        </div>

        <ListPaginationControls
          pathname="/dashboard/report-card"
          searchParams={resolvedSearchParams}
          page={pagedRows.page}
          size={pagedRows.size}
          totalItems={pagedRows.totalItems}
          totalPages={pagedRows.totalPages}
          startIndex={pagedRows.startIndex}
          endIndex={pagedRows.endIndex}
          noun="courses"
        />

        {rows.length === 0 ? (
          <div className="empty-state">No quiz attempts yet. Start a quiz from any course to populate your report card.</div>
        ) : (
          pagedRows.items.map((row) => (
            <section key={row.courseId} className="panel stack report-card-course-panel">
              <div className="panel-header">
                <div>
                  <h2 className="panel-title" style={{ marginBottom: 6 }}>{row.courseTitle}</h2>
                  <p className="muted" style={{ margin: 0 }}>Average best score across this course: {row.averagePercentage}%</p>
                </div>
                <Link href={`/courses/${row.courseId}`} className="button button-ghost">Open course</Link>
              </div>
              <div className="stack" style={{ gap: 12 }}>
                {row.quizzes.map((quiz) => (
                  <div key={quiz.nodeId} className="card report-card-quiz-row">
                    <div>
                      <strong>{quiz.nodeTitle}</strong>
                      <p className="muted" style={{ margin: '6px 0 0' }}>
                        Best score {quiz.bestScore}/{quiz.maxScore} · {quiz.attemptsCount} attempt{quiz.attemptsCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <div className="inline premium-badge-row">
                      <span className={`studio-badge ${quiz.percentage >= 75 ? 'studio-badge-success' : quiz.percentage >= 50 ? 'studio-badge-primary' : 'studio-badge-warning'}`}>
                        {quiz.percentage}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </section>
          ))
        )}
      </section>
    </AppShell>
  );
}


