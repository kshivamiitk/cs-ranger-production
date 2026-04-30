"use client";

import { useMemo, useRef, useState } from 'react';

import { formatDateLabel } from '@/lib/utils';

export type ContributionDay = {
  date: string;
  nodesCompletedCount: number;
  quizAttemptsCount: number;
  contributionScore: number;
};

function intensityClass(score: number) {
  if (score <= 0) return 'cf-heatmap-cell-empty';
  if (score === 1) return 'cf-heatmap-cell-low';
  if (score <= 3) return 'cf-heatmap-cell-medium';
  return 'cf-heatmap-cell-high';
}

const dayLabels = ['Mon', '', 'Wed', '', 'Fri', '', ''];

export function ContributionHeatmap(props: {
  title: string;
  description: string;
  days: ContributionDay[];
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [tooltip, setTooltip] = useState<null | { left: number; top: number; text: string }>(null);

  const weeks = useMemo(() => {
    const nextWeeks: ContributionDay[][] = [];
    for (let index = 0; index < props.days.length; index += 7) nextWeeks.push(props.days.slice(index, index + 7));
    return nextWeeks;
  }, [props.days]);

  const monthLabels = useMemo(() => {
    let previousMonth = '';
    return weeks.map((week) => {
      const first = week[0];
      if (!first) return '';
      const label = new Intl.DateTimeFormat('en-IN', { month: 'short' }).format(new Date(first.date));
      if (label === previousMonth) return '';
      previousMonth = label;
      return label;
    });
  }, [weeks]);

  const totalScore = props.days.reduce((sum, day) => sum + day.contributionScore, 0);
  const activeDays = props.days.filter((day) => day.contributionScore > 0).length;

  return (
    <section className="panel stack-lg v13-heatmap-panel">
      <div className="panel-header">
        <div>
          <h2 className="panel-title" style={{ margin: 0 }}>{props.title}</h2>
          <p className="muted" style={{ marginTop: 8 }}>{props.description}</p>
        </div>
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-primary">{activeDays} active days</span>
          <span className="studio-badge studio-badge-muted">{totalScore} total contributions</span>
        </div>
      </div>

      <div className="cf-heatmap-shell" ref={containerRef} onMouseLeave={() => setTooltip(null)}>
        <div className="cf-heatmap-month-row">
          <div />
          <div className="cf-heatmap-months">
            {monthLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
          </div>
        </div>
        <div className="cf-heatmap-body">
          <div className="cf-heatmap-day-labels">
            {dayLabels.map((label, index) => <span key={`${label}-${index}`}>{label}</span>)}
          </div>
          <div className="cf-heatmap-grid">
            {weeks.map((week, weekIndex) => (
              <div key={`week-${weekIndex}`} className="cf-heatmap-week-column">
                {week.map((day, dayIndex) => {
                  const text = `${formatDateLabel(day.date)} · ${day.nodesCompletedCount} nodes completed · ${day.quizAttemptsCount} quizzes submitted · ${day.contributionScore} total contributions`;
                  return (
                    <button
                      key={day.date}
                      type="button"
                      className={`cf-heatmap-cell ${intensityClass(day.contributionScore)}`}
                      title={text}
                      onMouseEnter={(event) => {
                        const parent = containerRef.current?.getBoundingClientRect();
                        const box = event.currentTarget.getBoundingClientRect();
                        if (!parent) return;
                        setTooltip({
                          left: box.left - parent.left + box.width / 2,
                          top: box.top - parent.top - 10,
                          text,
                        });
                      }}
                    >
                      <span className="sr-only">{text}</span>
                    </button>
                  );
                })}
                {week.length < 7
                  ? Array.from({ length: 7 - week.length }, (_, fillIndex) => <span key={`fill-${weekIndex}-${fillIndex}`} className="cf-heatmap-cell cf-heatmap-cell-empty" aria-hidden="true" />)
                  : null}
              </div>
            ))}
          </div>
        </div>
        {tooltip ? (
          <div className="cf-heatmap-tooltip" style={{ left: tooltip.left, top: tooltip.top }}>
            {tooltip.text}
          </div>
        ) : null}
      </div>

      <div className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
        <span className="muted">Less</span>
        <div className="inline" style={{ gap: 8 }}>
          <span className="cf-heatmap-cell cf-heatmap-cell-empty" />
          <span className="cf-heatmap-cell cf-heatmap-cell-low" />
          <span className="cf-heatmap-cell cf-heatmap-cell-medium" />
          <span className="cf-heatmap-cell cf-heatmap-cell-high" />
        </div>
        <span className="muted">More</span>
      </div>
    </section>
  );
}


