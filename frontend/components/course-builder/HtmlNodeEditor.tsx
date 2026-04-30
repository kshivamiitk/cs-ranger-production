'use client';

import { useState } from 'react';

import { AUTHORING_LIMITS } from '@/src/domain/contentLimits';
import type { HtmlNodePayload } from '@/src/domain/models';
import { ScrollablePreviewPanel } from '@/components/preview/ScrollablePreviewPanel';
import { HtmlSandbox } from '@/components/renderers/HtmlSandbox';
import { CountedTextAreaField } from '@/components/ui/CountedTextAreaField';

type HtmlPane = 'html' | 'css' | 'javascript';

const paneCopy: Record<HtmlPane, { label: string; placeholder: string; rows: number }> = {
  html: {
    label: 'HTML',
    placeholder: '<section class="lesson-card">\n  <h1>Interactive HTML node</h1>\n  <button data-csranger-action="next">Go to next node</button>\n</section>',
    rows: 16,
  },
  css: {
    label: 'CSS',
    placeholder: '.lesson-card { padding: 24px; border-radius: 24px; background: #111827; color: white; }',
    rows: 14,
  },
  javascript: {
    label: 'JavaScript',
    placeholder: "document.querySelector('button')?.addEventListener('click', () => window.CSRanger?.goToNextNode());",
    rows: 14,
  },
};

const paneCharacterLimits: Record<HtmlPane, number> = {
  html: AUTHORING_LIMITS.html,
  css: AUTHORING_LIMITS.css,
  javascript: AUTHORING_LIMITS.javascript,
};

export function HtmlNodeEditor(props: {
  payload: HtmlNodePayload;
  onChange: (payload: HtmlNodePayload) => void;
}) {
  const [activePane, setActivePane] = useState<HtmlPane>('html');
  const activeConfig = paneCopy[activePane];
  const activeValue = props.payload[activePane];

  function updatePane(value: string) {
    props.onChange({
      ...props.payload,
      [activePane]: value,
    });
  }

  return (
    <div className="stack-lg">
      <div className="segmented-control" role="tablist" aria-label="HTML authoring panes">
        {(Object.keys(paneCopy) as HtmlPane[]).map((pane) => (
          <button
            key={pane}
            type="button"
            className="segmented-control-button"
            data-active={activePane === pane}
            aria-pressed={activePane === pane}
            onClick={() => setActivePane(pane)}
          >
            {paneCopy[pane].label}
          </button>
        ))}
      </div>

      <div className="html-editor-workbench fade-in-panel">
        <section className="studio-form-card stack-lg html-editor-pane">
          <div className="stack" style={{ gap: 10 }}>
            <div className="field-label">Currently editing</div>
            <h3 className="panel-title" style={{ fontSize: '1.2rem' }}>{activeConfig.label}</h3>
            <p className="muted" style={{ margin: 0 }}>
              Switch between HTML, CSS, and JavaScript. v22.8 renders them as one complete mini-page, so local style.css/script.js references and button JavaScript work in the learner reader.
            </p>
          </div>

          <CountedTextAreaField
            label={activeConfig.label}
            value={activeValue}
            onChange={updatePane}
            rows={activeConfig.rows + 4}
            placeholder={activeConfig.placeholder}
            className="studio-code-area html-code-area"
            limit={paneCharacterLimits[activePane]}
          />
        </section>

        <div className="studio-inline-alert html-runtime-help-card">
          <strong>v22.8 HTML project mode:</strong> Put your structure in HTML, styling in CSS, and logic in JavaScript. If your HTML contains <code>&lt;link href="style.css" rel="stylesheet"&gt;</code> or <code>&lt;script src="script.js"&gt;&lt;/script&gt;</code>, CS Ranger injects these panes automatically. For course navigation, use <code>data-csranger-action="next"</code>, <code>data-csranger-action="previous"</code>, or <code>window.CSRanger.goToNextNode()</code>.
        </div>

        <ScrollablePreviewPanel
          className="html-preview-stage"
          label="HTML result preview"
          description="Combined HTML, CSS, and JavaScript output rendered in a full-height in-app sandbox."
          maxHeight={780}
          minHeight={560}
          tone="media"
          fullScreenTitle="HTML node preview"
          bodyClassName="preview-body-tight html-preview-body"
          fullScreenBodyClassName="fullscreen-node-stage html-preview-body"
          immersive
        >
          <HtmlSandbox html={props.payload.html} css={props.payload.css} javascript={props.payload.javascript} />
        </ScrollablePreviewPanel>
      </div>
    </div>
  );
}


