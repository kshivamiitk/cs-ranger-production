import Link from 'next/link';
import { notFound } from 'next/navigation';

import { ReaderShell } from '@/components/app-shell/ReaderShell';
import { CourseExplorerSidebar } from '@/components/course/CourseExplorerSidebar';
import { createServerContainer } from '@/src/infrastructure/container/server';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { requireServerViewer } from '@/src/presentation/serverPage';

export default async function QuizAttemptReportPage({
  params,
}: {
  params: Promise<{ courseId: string; nodeId: string; attemptId: string }>;
}) {
  const [{ courseId, nodeId, attemptId }, { viewer }, { catalogService }] = await Promise.all([
    params,
    requireServerViewer('/dashboard/report-card'),
    createServerContainer(),
  ]);
  const supabase = createServiceRoleSupabaseClient();

  const [{ data: attempt, error }, courseView, workspaceView] = await Promise.all([
    supabase
      .from('quiz_attempts')
      .select('id, course_id, node_id, learner_user_id, score, max_score, answers, submitted_at')
      .eq('id', attemptId)
      .single(),
    catalogService.getCourseNodeView(viewer, courseId, nodeId).catch(() => null),
    catalogService.getCourseWorkspaceView(viewer, courseId, nodeId).catch(() => null),
  ]);

  if (error || !attempt || attempt.learner_user_id !== viewer.user.id || attempt.course_id !== courseId || attempt.node_id !== nodeId) {
    notFound();
  }
  if (!courseView?.node || courseView.node.type !== 'quiz') {
    notFound();
  }

  const payload = courseView.node.payload as {
    format: 'markdown' | 'latex' | 'plain_text';
    items: Array<{
      id: string;
      prompt: string;
      options: Record<'A' | 'B' | 'C' | 'D', string>;
      correctOption: 'A' | 'B' | 'C' | 'D';
      explanation?: string | null;
    }>;
  };
  const answers = (attempt.answers ?? {}) as Record<'A' | 'B' | 'C' | 'D', 'A' | 'B' | 'C' | 'D'> & Record<string, 'A' | 'B' | 'C' | 'D'>;
  const questionResults = payload.items.map((item, index) => {
    const selected = answers[item.id] ?? null;
    const attempted = Boolean(selected);
    const isCorrect = selected === item.correctOption;
    const status = !attempted ? 'skipped' : isCorrect ? 'correct' : 'incorrect';
    return {
      index: index + 1,
      item,
      selected,
      attempted,
      isCorrect,
      status,
    };
  });
  const correctCount = questionResults.filter((entry) => entry.status === 'correct').length;
  const incorrectCount = questionResults.filter((entry) => entry.status === 'incorrect').length;
  const skippedCount = questionResults.filter((entry) => entry.status === 'skipped').length;
  const percentage = attempt.max_score > 0 ? Math.round((attempt.score / attempt.max_score) * 100) : 0;

  return (
    <ReaderShell
      eyebrow="Quiz attempt report"
      title={courseView.node.title}
      subtitle={`Attempt review for ${courseView.course.title}`}
      sidebar={workspaceView ? (
        <CourseExplorerSidebar
          courseId={courseId}
          courseTitle={workspaceView.course.title}
          modules={workspaceView.course.modules}
          activeModuleId={courseView.module?.id ?? null}
          activeNodeId={nodeId}
        />
      ) : null}
    >
      <section className="panel stack-lg quiz-attempt-report-shell">
        <div className="panel-header">
          <div>
            <div className="section-label">Attempt summary</div>
            <h2 className="panel-title" style={{ marginBottom: 8 }}>Score {attempt.score}/{attempt.max_score} · {percentage}%</h2>
            <p className="muted" style={{ margin: 0 }}>Submitted at {new Date(attempt.submitted_at).toLocaleString()}</p>
          </div>
          <div className="inline premium-badge-row">
            <Link href={`/courses/${courseId}/nodes/${nodeId}`} className="button button-secondary">Return to quiz</Link>
            <Link href="/dashboard/report-card" className="button button-ghost">Open report card</Link>
          </div>
        </div>

        <div className="grid-4 quiz-attempt-summary-grid">
          <div className="card stack"><span className="field-label">Correct</span><strong>{correctCount}</strong></div>
          <div className="card stack"><span className="field-label">Incorrect</span><strong>{incorrectCount}</strong></div>
          <div className="card stack"><span className="field-label">Skipped</span><strong>{skippedCount}</strong></div>
          <div className="card stack"><span className="field-label">Status</span><strong>{percentage >= 50 ? 'Passed' : 'Needs retry'}</strong></div>
        </div>

        <div className="stack quiz-attempt-question-list">
          {questionResults.map((entry) => (
            <article key={entry.item.id} className="card stack quiz-attempt-question-card">
              <div className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
                <div className="inline premium-badge-row">
                  <span className="studio-badge studio-badge-muted">Question {entry.index}</span>
                  <span className={`studio-badge ${entry.status === 'correct' ? 'studio-badge-success' : entry.status === 'incorrect' ? 'studio-badge-warning' : 'studio-badge-muted'}`}>
                    {entry.status}
                  </span>
                </div>
                <span className="studio-badge studio-badge-muted">Correct answer {entry.item.correctOption}</span>
              </div>

              <div className="stack" style={{ gap: 10 }}>
                <p className="muted" style={{ margin: 0 }}>{entry.item.prompt}</p>
              </div>

              <div className="grid-2 quiz-attempt-options-grid">
                {(['A', 'B', 'C', 'D'] as const).map((optionKey) => (
                  <div key={optionKey} className="quiz-option" data-selected={entry.selected === optionKey}>
                    <strong>{optionKey}</strong>
                    <span>{entry.item.options[optionKey]}</span>
                  </div>
                ))}
              </div>

              <div className="inline premium-badge-row">
                <span className="studio-badge studio-badge-primary">Selected {entry.selected ?? 'Not attempted'}</span>
                {entry.item.explanation ? <span className="studio-badge studio-badge-muted">Explanation available below</span> : null}
              </div>
              {entry.item.explanation ? <p className="muted" style={{ margin: 0 }}>{entry.item.explanation}</p> : null}
            </article>
          ))}
        </div>
      </section>
    </ReaderShell>
  );
}


