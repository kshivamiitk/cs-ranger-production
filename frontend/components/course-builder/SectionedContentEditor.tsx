'use client';

import { useMemo, useState } from 'react';

import { AUTHORING_LIMITS } from '@/src/domain/contentLimits';
import { contentNodeSections, type ContentSectionKey } from '@/src/domain/contentSections';
import { detectLatexSourceMode } from '@/src/domain/latexSource';
import type { ContentNodePayload } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';
import { ScrollablePreviewPanel } from '@/components/preview/ScrollablePreviewPanel';
import { RichFormatSelect } from '@/components/course-builder/RichFormatSelect';
import { CountedTextAreaField } from '@/components/ui/CountedTextAreaField';

const sectionCharacterLimits = {
  introduction: AUTHORING_LIMITS.contentIntroduction,
  explanation: AUTHORING_LIMITS.contentExplanation,
  solvedExamples: AUTHORING_LIMITS.contentSolvedExamples,
} as const;

export function SectionedContentEditor(props: {
  payload: ContentNodePayload;
  onChange: (payload: ContentNodePayload) => void;
}) {
  const [activeSection, setActiveSection] = useState<ContentSectionKey>('introduction');

  const activeConfig = useMemo(
    () => contentNodeSections.find((section) => section.key === activeSection) ?? contentNodeSections[0],
    [activeSection]
  );
  const activeValue = props.payload[activeSection];
  const activeLatexMode = activeValue.format === 'latex' ? detectLatexSourceMode(activeValue.content) : null;

  function updateSection(next: Partial<ContentNodePayload[ContentSectionKey]>) {
    props.onChange({
      ...props.payload,
      [activeSection]: {
        ...props.payload[activeSection],
        ...next,
      },
    });
  }

  return (
    <div className="stack-lg">
        <div className="segmented-control" role="tablist" aria-label="Content sections">
        {contentNodeSections.map((section) => (
          <button
            key={section.key}
            type="button"
            className="segmented-control-button"
            data-active={activeSection === section.key}
            aria-pressed={activeSection === section.key}
            onClick={() => setActiveSection(section.key)}
          >
            {section.label}
          </button>
        ))}
      </div>

      <div className="section-editor-workbench section-editor-card fade-in-panel">
        <section className="studio-form-card stack-lg section-editor-pane">
          <div className="stack" style={{ gap: 10 }}>
            <div className="field-label">Currently editing</div>
            <h3 className="panel-title" style={{ fontSize: '1.3rem' }}>{activeConfig.label}</h3>
            <p className="muted" style={{ margin: 0 }}>{activeConfig.description}</p>
          </div>

          <div className="grid-2">
            <RichFormatSelect
              label={`${activeConfig.label} format`}
              value={activeValue.format}
              onChange={(format) => updateSection({ format })}
            />
            <div className="card stack" style={{ gap: 10 }}>
              <div className="field-label">Authoring guidance</div>
              <p className="muted" style={{ margin: 0 }}>
                Each lesson section is compiled independently. Markdown stays on the markdown renderer. LaTeX sections can be authored either as fragments or as full standalone documents.
              </p>
              {activeLatexMode ? (
                <div className="inline premium-badge-row">
                  <span className="studio-badge studio-badge-primary">
                    {activeLatexMode === 'document' ? 'Full LaTeX document' : 'LaTeX fragment'}
                  </span>
                  <span className="studio-badge studio-badge-muted">
                    {activeLatexMode === 'document'
                      ? 'This section keeps its own preamble and document structure.'
                      : 'This section is wrapped in the default preview template before compilation.'}
                  </span>
                </div>
              ) : null}
            </div>
          </div>

          <CountedTextAreaField
            label={activeConfig.label}
            value={activeValue.content}
            onChange={(value) => updateSection({ content: value })}
            placeholder={activeConfig.placeholder}
            rows={activeSection === 'explanation' ? 18 : 14}
            className="studio-code-area"
            limit={sectionCharacterLimits[activeSection]}
          />
        </section>

        <ScrollablePreviewPanel
          className="section-editor-preview-stage"
          label={`${activeConfig.label} preview`}
          description={
            activeValue.format === 'latex'
              ? activeLatexMode === 'document'
                ? 'This section is compiled as a full LaTeX document and shown inside the in-app reader.'
                : 'This section is compiled as a LaTeX fragment inside the default preview document template.'
              : 'Scrollable markdown reader surface inside the app.'
          }
          maxHeight={760}
          minHeight={560}
          tone={activeValue.format === 'latex' ? 'document' : 'default'}
          fullScreenTitle={`${activeConfig.label} preview`}
          immersive
          fullScreenBodyClassName="fullscreen-node-stage"
        >
          <RichContentRenderer format={activeValue.format} content={activeValue.content} />
        </ScrollablePreviewPanel>
      </div>
    </div>
  );
}


