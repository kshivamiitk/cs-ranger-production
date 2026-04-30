'use client';

import { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Code2, Eye, ListChecks, PlusCircle, Trash2 } from 'lucide-react';

import { AUTHORING_LIMITS } from '@/src/domain/contentLimits';
import type { QuizNodePayload, QuizOptionKey } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';
import { ScrollablePreviewPanel } from '@/components/preview/ScrollablePreviewPanel';
import { RichFormatSelect } from '@/components/course-builder/RichFormatSelect';
import { Button } from '@/components/ui/Button';
import { CountedTextAreaField } from '@/components/ui/CountedTextAreaField';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';

const optionKeys: QuizOptionKey[] = ['A', 'B', 'C', 'D'];

type EditorTab = 'builder' | 'json' | 'preview';

type ParsedQuizShape = {
  title?: string;
  timeLimitSeconds?: number;
  shuffleQuestions?: boolean;
  questions?: Array<{
    id: string;
    type?: string;
    prompt: string;
    options: Array<{ id: string; label: string }>;
    correctAnswer: string;
    explanation?: string;
    points?: number;
  }>;
};

function payloadToJson(payload: QuizNodePayload) {
  return JSON.stringify(
    {
      title: 'Quiz',
      timeLimitSeconds: payload.timerSeconds,
      questions: payload.items.map((item) => ({
        id: item.id,
        type: 'single_choice',
        prompt: item.prompt,
        options: optionKeys.map((key) => ({ id: key, label: item.options[key] })),
        correctAnswer: item.correctOption,
        explanation: item.explanation ?? '',
        points: item.points ?? 1,
      })),
    },
    null,
    2
  );
}

function jsonToPayload(input: ParsedQuizShape, current: QuizNodePayload): QuizNodePayload {
  return {
    ...current,
    sourceFormat: 'json',
    rawJson: JSON.stringify(input, null, 2),
    timerSeconds: Math.max(10, input.timeLimitSeconds ?? current.timerSeconds ?? 300),
    items: (input.questions ?? []).map((question, index) => ({
      id: question.id || `q${index + 1}`,
      prompt: question.prompt,
      options: {
        A: question.options.find((option) => option.id === 'A')?.label ?? '',
        B: question.options.find((option) => option.id === 'B')?.label ?? '',
        C: question.options.find((option) => option.id === 'C')?.label ?? '',
        D: question.options.find((option) => option.id === 'D')?.label ?? '',
      },
      correctOption: (question.correctAnswer || 'A') as QuizOptionKey,
      explanation: question.explanation ?? '',
      points: question.points ?? 1,
      sourceFormat: 'json',
    })),
  };
}

function validateQuizJson(raw: string) {
  try {
    const parsed = JSON.parse(raw) as ParsedQuizShape;
    if (!Array.isArray(parsed.questions) || parsed.questions.length === 0) {
      return { ok: false as const, error: 'JSON must include a non-empty questions array.' };
    }

    for (const [index, question] of parsed.questions.entries()) {
      if (!question.id?.trim()) return { ok: false as const, error: `Question ${index + 1} is missing id.` };
      if (!question.prompt?.trim()) return { ok: false as const, error: `Question ${index + 1} is missing prompt.` };
      if (!Array.isArray(question.options) || question.options.length !== 4) {
        return { ok: false as const, error: `Question ${index + 1} must have exactly 4 options.` };
      }
      const optionIds = question.options.map((option) => option.id);
      for (const key of optionKeys) {
        if (!optionIds.includes(key)) {
          return { ok: false as const, error: `Question ${index + 1} must include option ${key}.` };
        }
      }
      if (!optionIds.includes(question.correctAnswer)) {
        return { ok: false as const, error: `Question ${index + 1} has an invalid correctAnswer.` };
      }
    }

    return { ok: true as const, value: parsed };
  } catch (error) {
    return { ok: false as const, error: error instanceof Error ? error.message : 'Invalid JSON.' };
  }
}

export function QuizNodeEditor(props: {
  payload: QuizNodePayload;
  onChange: (payload: QuizNodePayload) => void;
}) {
  const [activeTab, setActiveTab] = useState<EditorTab>('builder');
  const [activeItemId, setActiveItemId] = useState<string | null>(props.payload.items[0]?.id ?? null);
  const [jsonSource, setJsonSource] = useState(props.payload.rawJson ?? payloadToJson(props.payload));
  const [jsonFeedback, setJsonFeedback] = useState<string | null>(null);
  const [jsonFeedbackTone, setJsonFeedbackTone] = useState<'success' | 'danger' | null>(null);

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

  useEffect(() => {
    if (activeTab !== 'json') {
      setJsonSource(props.payload.rawJson ?? payloadToJson(props.payload));
    }
  }, [activeTab, props.payload]);

  return (
    <div className="stack-lg">
      <div className="inline premium-badge-row">
        <button type="button" className={`segmented-control-button${activeTab === 'builder' ? ' is-active' : ''}`} onClick={() => setActiveTab('builder')}>
          <ListChecks size={15} />
          Builder
        </button>
        <button type="button" className={`segmented-control-button${activeTab === 'json' ? ' is-active' : ''}`} onClick={() => setActiveTab('json')}>
          <Code2 size={15} />
          JSON
        </button>
        <button type="button" className={`segmented-control-button${activeTab === 'preview' ? ' is-active' : ''}`} onClick={() => setActiveTab('preview')}>
          <Eye size={15} />
          Preview
        </button>
      </div>

      <div className="grid-2">
        <RichFormatSelect value={props.payload.format} onChange={(format) => props.onChange({ ...props.payload, format })} />
        <label className="field">
          <span className="field-label">Timer in seconds</span>
          <Input
            type="number"
            min="10"
            max="7200"
            value={String(props.payload.timerSeconds)}
            onChange={(event) =>
              props.onChange({
                ...props.payload,
                timerSeconds: Math.max(10, Number(event.target.value) || 10),
              })
            }
          />
        </label>
      </div>

      {activeTab === 'json' ? (
        <section className="panel stack-lg">
          <div className="panel-header">
            <div>
              <h3 className="panel-title">Structured JSON authoring</h3>
              <p className="muted" style={{ margin: '8px 0 0' }}>
                Paste structured quiz JSON here. Prompt and explanation fields can contain markdown, and the learner exam shell renders from the parsed question model.
              </p>
            </div>
            <div className="inline premium-badge-row">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setJsonSource(payloadToJson(props.payload));
                  setJsonFeedback('Refreshed from the builder state.');
                  setJsonFeedbackTone('success');
                }}
              >
                Export current
              </Button>
              <Button
                type="button"
                onClick={() => {
                  const parsed = validateQuizJson(jsonSource);
                  if (!parsed.ok) {
                    setJsonFeedback(parsed.error);
                    setJsonFeedbackTone('danger');
                    return;
                  }
                  props.onChange(jsonToPayload(parsed.value, props.payload));
                  setJsonFeedback('JSON validated and imported into the quiz node.');
                  setJsonFeedbackTone('success');
                  setActiveTab('preview');
                }}
              >
                Validate & import
              </Button>
            </div>
          </div>

          <textarea
            className="studio-code-area quiz-json-editor"
            rows={24}
            value={jsonSource}
            onChange={(event) => setJsonSource(event.target.value)}
          />

          {jsonFeedback ? (
            <div className={`inline premium-badge-row${jsonFeedbackTone === 'danger' ? ' danger-inline-copy' : ''}`}>
              {jsonFeedbackTone === 'danger' ? <AlertTriangle size={15} /> : <CheckCircle2 size={15} />}
              <span>{jsonFeedback}</span>
            </div>
          ) : null}
        </section>
      ) : null}

      {activeTab === 'preview' ? (
        <section className="panel stack-lg">
          <div>
            <h3 className="panel-title">Learner quiz preview</h3>
            <p className="muted" style={{ margin: '8px 0 0' }}>This preview mirrors the learner-facing renderer and exam card structure.</p>
          </div>
          <ScrollablePreviewPanel
            className="question-preview-stage"
            label="Quiz preview"
            description="Review the quiz questions, options, correct answers, and explanations before publishing."
            maxHeight={760}
            minHeight={560}
            tone={props.payload.format === 'latex' ? 'document' : 'default'}
            fullScreenTitle="Quiz preview"
            immersive
            fullScreenBodyClassName="fullscreen-node-stage"
          >
            <div className="stack-lg">
              {props.payload.items.map((item, index) => (
                <article key={item.id} className="card stack">
                  <div className="inline premium-badge-row">
                    <span className="studio-badge studio-badge-primary">Question {index + 1}</span>
                    <span className="studio-badge studio-badge-muted">Correct {item.correctOption}</span>
                  </div>
                  <RichContentRenderer format={props.payload.format} content={item.prompt} />
                  <div className="stack">
                    {optionKeys.map((optionKey) => (
                      <div key={optionKey} className="quiz-option" data-selected={item.correctOption === optionKey}>
                        <strong>{optionKey}</strong>
                        <RichContentRenderer format={props.payload.format} content={item.options[optionKey]} />
                      </div>
                    ))}
                  </div>
                  {item.explanation ? <p className="muted" style={{ margin: 0 }}>{item.explanation}</p> : null}
                </article>
              ))}
            </div>
          </ScrollablePreviewPanel>
        </section>
      ) : null}

      {activeTab === 'builder' ? (
        <div className="question-node-layout fade-in-panel">
          <aside className="question-navigator-panel">
            <div className="course-rail-header">
              <div>
                <div className="section-label">Quiz navigator</div>
                <h3 className="panel-title" style={{ marginTop: 10 }}>Quiz items</h3>
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
                    <strong className="course-module-rail-title">Quiz item {index + 1}</strong>
                    <p className="course-module-rail-summary">{item.prompt.trim() || 'No quiz prompt yet.'}</p>
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
                  prompt: 'Write the quiz question here.',
                  options: {
                    A: 'Option A',
                    B: 'Option B',
                    C: 'Option C',
                    D: 'Option D',
                  },
                  correctOption: 'A' as QuizOptionKey,
                  explanation: '',
                  points: 1,
                };
                props.onChange({
                  ...props.payload,
                  items: [...props.payload.items, nextItem],
                });
                setActiveItemId(nextItem.id);
              }}
            >
              <PlusCircle size={16} />
              Add quiz item
            </Button>
          </aside>

          {activeItem ? (
            <section className="question-detail-stage">
              <div className="module-card-header">
                <div>
                  <div className="field-label">Quiz item {activeIndex + 1}</div>
                  <p className="muted" style={{ margin: '8px 0 0' }}>
                    Edit the active item while keeping the learner-style preview and JSON pipeline consistent.
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
                    limit={AUTHORING_LIMITS.quizPrompt}
                  />

                  <div className="grid-2">
                    {optionKeys.map((optionKey) => (
                      <CountedTextAreaField
                        key={optionKey}
                        label={`Option ${optionKey}`}
                        value={activeItem.options[optionKey]}
                        onChange={(value) =>
                          props.onChange({
                            ...props.payload,
                            items: props.payload.items.map((entry) =>
                              entry.id === activeItem.id
                                ? {
                                    ...entry,
                                    options: {
                                      ...entry.options,
                                      [optionKey]: value,
                                    },
                                  }
                                : entry
                            ),
                          })
                        }
                        rows={5}
                        className="studio-code-area"
                        limit={AUTHORING_LIMITS.quizOption}
                      />
                    ))}
                  </div>

                  <CountedTextAreaField
                    label="Explanation (optional)"
                    value={activeItem.explanation ?? ''}
                    onChange={(value) =>
                      props.onChange({
                        ...props.payload,
                        items: props.payload.items.map((entry) =>
                          entry.id === activeItem.id ? { ...entry, explanation: value } : entry
                        ),
                      })
                    }
                    rows={5}
                    className="studio-code-area"
                    limit={AUTHORING_LIMITS.quizPrompt}
                  />

                  <div className="grid-2">
                    <label className="field">
                      <span className="field-label">Correct answer</span>
                      <Select
                        value={activeItem.correctOption}
                        onChange={(event) =>
                          props.onChange({
                            ...props.payload,
                            items: props.payload.items.map((entry) =>
                              entry.id === activeItem.id
                                ? { ...entry, correctOption: event.target.value as QuizOptionKey }
                                : entry
                            ),
                          })
                        }
                      >
                        {optionKeys.map((optionKey) => (
                          <option key={optionKey} value={optionKey}>
                            {optionKey}
                          </option>
                        ))}
                      </Select>
                    </label>

                    <label className="field">
                      <span className="field-label">Points</span>
                      <Input
                        type="number"
                        min="1"
                        value={String(activeItem.points ?? 1)}
                        onChange={(event) =>
                          props.onChange({
                            ...props.payload,
                            items: props.payload.items.map((entry) =>
                              entry.id === activeItem.id ? { ...entry, points: Math.max(1, Number(event.target.value) || 1) } : entry
                            ),
                          })
                        }
                      />
                    </label>
                  </div>
                </section>

                <ScrollablePreviewPanel
                  className="question-preview-stage"
                  label={`Quiz item ${activeIndex + 1} preview`}
                  description="Scrollable quiz preview including the prompt, all four options, the correct answer, and optional explanation."
                  maxHeight={760}
                  minHeight={560}
                  tone={props.payload.format === 'latex' ? 'document' : 'default'}
                  fullScreenTitle={`Quiz item ${activeIndex + 1} preview`}
                  immersive
                  fullScreenBodyClassName="fullscreen-node-stage"
                >
                  <div className="stack">
                    <div className="muted">Question</div>
                    <RichContentRenderer format={props.payload.format} content={activeItem.prompt} />
                    <div className="stack">
                      {optionKeys.map((optionKey) => (
                        <div key={optionKey} className="quiz-option" data-selected={activeItem.correctOption === optionKey}>
                          <strong>{optionKey}</strong>
                          <RichContentRenderer format={props.payload.format} content={activeItem.options[optionKey]} />
                        </div>
                      ))}
                    </div>
                    <div className="muted">Correct answer: {activeItem.correctOption}</div>
                    {activeItem.explanation ? <p className="muted" style={{ margin: 0 }}>{activeItem.explanation}</p> : null}
                  </div>
                </ScrollablePreviewPanel>
              </div>
            </section>
          ) : null}
        </div>
      ) : null}
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


