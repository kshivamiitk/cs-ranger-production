'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';

import type { QuizNodePayload, QuizOptionKey } from '@/src/domain/models';
import { Button } from '@/components/ui/Button';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';
import { apiJson } from '@/src/presentation/http/client';

interface QuizAttemptCardProps {
  courseId?: string;
  nodeId?: string;
  title: string;
  payload: QuizNodePayload;
  interactive: boolean;
  showTitle?: boolean;
  mode?: 'preview' | 'reader' | 'immersive';
}

export function QuizAttemptCard({
  courseId,
  nodeId,
  title,
  payload,
  interactive,
  showTitle = true,
  mode = 'preview',
}: QuizAttemptCardProps) {
  const shellRef = useRef<HTMLDivElement | null>(null);
  const router = useRouter();
  const [answers, setAnswers] = useState<Record<string, QuizOptionKey>>({});
  const [remainingSeconds, setRemainingSeconds] = useState(payload.timerSeconds);
  const [error, setError] = useState<string | null>(null);
  const [started, setStarted] = useState(!interactive);
  const [activeQuestionIndex, setActiveQuestionIndex] = useState(0);
  const [focusWarnings, setFocusWarnings] = useState(0);
  const [examMode, setExamMode] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!interactive || !started || submitting) return;

    const timer = setInterval(() => {
      setRemainingSeconds((current) => {
        if (current <= 1) {
          clearInterval(timer);
          return 0;
        }

        return current - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [interactive, started, submitting]);

  useEffect(() => {
    if (interactive && started && remainingSeconds === 0 && !submitting) {
      void submitAttempt();
    }
  }, [interactive, started, remainingSeconds, submitting]);

  useEffect(() => {
    if (!interactive || !started || submitting) {
      return;
    }

    function handleVisibilityChange() {
      if (document.hidden) {
        setFocusWarnings((current) => current + 1);
      }
    }

    function handleFullscreenChange() {
      setExamMode(Boolean(document.fullscreenElement));
    }

    document.addEventListener('visibilitychange', handleVisibilityChange);
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, [interactive, started, submitting]);

  const formattedTime = useMemo(() => {
    const minutes = Math.floor(remainingSeconds / 60);
    const seconds = remainingSeconds % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, [remainingSeconds]);

  const progressLabel = useMemo(() => {
    const answered = payload.items.filter((item) => Boolean(answers[item.id])).length;
    return `${answered}/${payload.items.length} answered`;
  }, [answers, payload.items]);

  async function startQuiz() {
    setStarted(true);
    if (shellRef.current?.requestFullscreen) {
      try {
        await shellRef.current.requestFullscreen();
        setExamMode(true);
      } catch {
        setExamMode(false);
      }
    }
  }

  async function submitAttempt() {
    if (!interactive || !courseId || !nodeId || submitting) {
      return;
    }

    try {
      setSubmitting(true);
      const response = await apiJson<{ attempt: { id: string; score: number; maxScore: number } }>(
        `/api/courses/${courseId}/quiz-attempts`,
        {
          method: 'POST',
          body: JSON.stringify({
            nodeId,
            answers,
          }),
        }
      );
      setError(null);
      if (document.fullscreenElement && document.exitFullscreen) {
        await document.exitFullscreen().catch(() => undefined);
      }
      router.push(`/courses/${courseId}/nodes/${nodeId}/attempts/${response.attempt.id}`);
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Quiz submission failed.');
      setSubmitting(false);
    }
  }

  if (interactive && !started) {
    return (
      <div className="quiz-exam-shell" ref={shellRef} data-mode={mode}>
        <div className="quiz-exam-intro card stack-lg">
          {showTitle ? <h3 className="panel-title" style={{ margin: 0 }}>{title}</h3> : null}
          <p className="muted" style={{ margin: 0 }}>
            Start the quiz to enter exam mode. The timer begins immediately, the quiz requests fullscreen, and the question stage becomes the dedicated scrollable area.
          </p>
          <div className="grid-3 quiz-exam-kpis">
            <div className="card stack"><span className="field-label">Questions</span><strong>{payload.items.length}</strong></div>
            <div className="card stack"><span className="field-label">Timer</span><strong>{formattedTime}</strong></div>
            <div className="card stack"><span className="field-label">Mode</span><strong>Fullscreen</strong></div>
          </div>
          <div className="inline premium-badge-row">
            <Button type="button" onClick={() => void startQuiz()}>Start quiz</Button>
            <span className="studio-badge studio-badge-muted">Exam-style layout</span>
          </div>
        </div>
      </div>
    );
  }

  const activeItem = payload.items[activeQuestionIndex] ?? payload.items[0];

  return (
    <div className="quiz-exam-shell" ref={shellRef} data-mode={mode} data-exam-mode={examMode}>
      <div className="quiz-exam-header">
        <div className="stack" style={{ gap: 6 }}>
          {showTitle ? <h3 className="panel-title" style={{ margin: 0 }}>{title}</h3> : null}
          <div className="inline premium-badge-row">
            <span className="studio-badge studio-badge-primary">Timer {formattedTime}</span>
            <span className="studio-badge studio-badge-muted">{progressLabel}</span>
            {focusWarnings > 0 ? <span className="studio-badge studio-badge-warning">Focus warnings {focusWarnings}</span> : null}
          </div>
        </div>
        {interactive ? (
          <Button type="button" variant="secondary" onClick={() => void submitAttempt()} disabled={submitting}>
            {submitting ? 'Submitting…' : 'Submit quiz'}
          </Button>
        ) : null}
      </div>

      <div className="quiz-exam-layout">
        <aside className="quiz-question-rail">
          {payload.items.map((item, index) => (
            <button
              key={item.id}
              type="button"
              className="quiz-question-rail-item"
              data-active={index === activeQuestionIndex}
              data-complete={Boolean(answers[item.id])}
              onClick={() => setActiveQuestionIndex(index)}
            >
              <span className="course-module-rail-index">{String(index + 1).padStart(2, '0')}</span>
              <span className="course-module-rail-title">Question {index + 1}</span>
            </button>
          ))}
        </aside>

        <section className="quiz-question-stage">
          <article className="node-card stack-lg quiz-question-stage-card">
            <div className="muted">Question {activeQuestionIndex + 1}</div>
            <div className="quiz-question-scroll-region">
              <RichContentRenderer format={payload.format} content={activeItem.prompt} />
              <div className="stack">
                {(['A', 'B', 'C', 'D'] as QuizOptionKey[]).map((optionKey) => (
                  <button
                    key={optionKey}
                    type="button"
                    className="quiz-option"
                    data-selected={answers[activeItem.id] === optionKey}
                    onClick={() => {
                      if (!interactive || submitting) return;
                      setAnswers((current) => ({ ...current, [activeItem.id]: optionKey }));
                    }}
                  >
                    <strong>{optionKey}</strong>
                    <RichContentRenderer format={payload.format} content={activeItem.options[optionKey]} />
                  </button>
                ))}
              </div>
              {!interactive ? <div className="muted">Correct answer: {activeItem.correctOption}</div> : null}
            </div>
          </article>

          <div className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
            <Button type="button" variant="ghost" onClick={() => setActiveQuestionIndex((current) => Math.max(0, current - 1))} disabled={activeQuestionIndex === 0}>
              Previous
            </Button>
            <Button type="button" variant="secondary" onClick={() => setActiveQuestionIndex((current) => Math.min(payload.items.length - 1, current + 1))} disabled={activeQuestionIndex >= payload.items.length - 1}>
              Next
            </Button>
          </div>
          {error ? <span style={{ color: 'var(--danger)' }}>{error}</span> : null}
        </section>
      </div>
    </div>
  );
}


