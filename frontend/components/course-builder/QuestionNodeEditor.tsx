'use client';

import { useEffect, useMemo, useState } from 'react';
import { ChevronDown, ChevronUp, PlusCircle, Trash2 } from 'lucide-react';

import { AUTHORING_LIMITS } from '@/src/domain/contentLimits';
import type { QuestionNodePayload } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';
import { ScrollablePreviewPanel } from '@/components/preview/ScrollablePreviewPanel';
import { RichFormatSelect } from '@/components/course-builder/RichFormatSelect';
import { Button } from '@/components/ui/Button';
import { CountedTextAreaField } from '@/components/ui/CountedTextAreaField';

export function QuestionNodeEditor(props: {
  payload: QuestionNodePayload;
  onChange: (payload: QuestionNodePayload) => void;
}) {
  const [activeItemId, setActiveItemId] = useState<string | null>(props.payload.items[0]?.id ?? null);
  const activeIndex = useMemo(
    () => props.payload.items.findIndex((item) => item.id === activeItemId),
    [activeItemId, props.payload.items]
  );
  const activeItem = activeIndex >= 0 ? props.payload.items[activeIndex] : props.payload.items[0] ?? null;

  useEffect(() => {
    if (!props.payload.items.length) {
      setActiveItemId(null);
      return;
    }

    if (!activeItemId || !props.payload.items.some((item) => item.id === activeItemId)) {
      setActiveItemId(props.payload.items[0]?.id ?? null);
    }
  }, [activeItemId, props.payload.items]);

  return (
    <div className="stack-lg">
      <RichFormatSelect value={props.payload.format} onChange={(format) => props.onChange({ ...props.payload, format })} />

      <div className="question-node-layout fade-in-panel">
        <aside className="question-navigator-panel">
          <div className="course-rail-header">
            <div>
              <div className="section-label">Question navigator</div>
              <h3 className="panel-title" style={{ marginTop: 10 }}>Question set</h3>
            </div>
            <span className="studio-badge studio-badge-muted">
              {props.payload.items.length} item{props.payload.items.length === 1 ? '' : 's'}
            </span>
          </div>

          <div className="question-navigator-list">
            {props.payload.items.map((item, index) => (
              <button
                key={item.id}
                type="button"
                className="question-navigator-item"
                data-active={activeItem?.id === item.id}
                aria-pressed={activeItem?.id === item.id}
                onClick={() => setActiveItemId(item.id)}
              >
                <span className="course-module-rail-index">{String(index + 1).padStart(2, '0')}</span>
                <div className="question-navigator-copy">
                  <strong className="course-module-rail-title">Question {index + 1}</strong>
                  <p className="course-module-rail-summary">{item.prompt.trim() || 'No question prompt yet.'}</p>
                </div>
              </button>
            ))}
          </div>

          <Button
            type="button"
            variant="secondary"
            onClick={() => {
              const nextItem = {
                id: crypto.randomUUID(),
                prompt: 'Write the question here.',
                solution: 'Write the solution here.',
              };
              props.onChange({
                ...props.payload,
                items: [...props.payload.items, nextItem],
              });
              setActiveItemId(nextItem.id);
            }}
          >
            <PlusCircle size={16} />
            Add question
          </Button>
        </aside>

        {activeItem ? (
          <section className="question-detail-stage">
            <div className="module-card-header">
              <div>
                <div className="field-label">Question {activeIndex + 1}</div>
                <p className="muted" style={{ margin: '8px 0 0' }}>
                  Keep the authored question and worked solution together. The preview stage uses the shared markdown/LaTeX renderer.
                </p>
              </div>
              <div className="module-card-actions">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => props.onChange({ ...props.payload, items: moveItem(props.payload.items, activeIndex, -1) })}
                  disabled={activeIndex <= 0}
                >
                  <ChevronUp size={16} />
                  Up
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => props.onChange({ ...props.payload, items: moveItem(props.payload.items, activeIndex, 1) })}
                  disabled={activeIndex === props.payload.items.length - 1}
                >
                  <ChevronDown size={16} />
                  Down
                </Button>
                <Button
                  type="button"
                  variant="danger"
                  onClick={() => {
                    const nextItems = props.payload.items.filter((entry) => entry.id !== activeItem.id);
                    props.onChange({ ...props.payload, items: nextItems });
                    setActiveItemId(nextItems[0]?.id ?? null);
                  }}
                  disabled={props.payload.items.length === 1}
                >
                  <Trash2 size={16} />
                  Remove
                </Button>
              </div>
            </div>

            <div className="editor-stage-split">
              <section className="studio-form-card stack-lg question-editor-pane">
                <CountedTextAreaField
                  label="Question body"
                  value={activeItem.prompt}
                  onChange={(value) =>
                    props.onChange({
                      ...props.payload,
                      items: props.payload.items.map((entry) =>
                        entry.id === activeItem.id ? { ...entry, prompt: value } : entry
                      ),
                    })
                  }
                  rows={10}
                  className="studio-code-area"
                  limit={AUTHORING_LIMITS.questionPrompt}
                />

                <CountedTextAreaField
                  label="Solution body"
                  value={activeItem.solution}
                  onChange={(value) =>
                    props.onChange({
                      ...props.payload,
                      items: props.payload.items.map((entry) =>
                        entry.id === activeItem.id ? { ...entry, solution: value } : entry
                      ),
                    })
                  }
                  rows={10}
                  className="studio-code-area"
                  limit={AUTHORING_LIMITS.questionSolution}
                />
              </section>

              <ScrollablePreviewPanel
                className="question-preview-stage"
                label={`Question ${activeIndex + 1} preview`}
                description="Scrollable preview of the question and its solution exactly as learners will read it."
                maxHeight={760}
                minHeight={560}
                tone={props.payload.format === 'latex' ? 'document' : 'default'}
                fullScreenTitle={`Question ${activeIndex + 1} preview`}
                immersive
                fullScreenBodyClassName="fullscreen-node-stage"
              >
                <div className="stack">
                  <div className="muted">Question</div>
                  <RichContentRenderer format={props.payload.format} content={activeItem.prompt} />
                  <div className="divider" />
                  <div className="muted">Solution</div>
                  <RichContentRenderer format={props.payload.format} content={activeItem.solution} />
                </div>
              </ScrollablePreviewPanel>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function moveItem<T>(items: T[], index: number, direction: -1 | 1) {
  const nextIndex = index + direction;
  if (nextIndex < 0 || nextIndex >= items.length) {
    return items;
  }

  const nextItems = [...items];
  const [item] = nextItems.splice(index, 1);
  nextItems.splice(nextIndex, 0, item);
  return nextItems;
}


