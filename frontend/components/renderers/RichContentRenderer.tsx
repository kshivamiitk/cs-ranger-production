'use client';

import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

import { detectLatexSourceMode } from '@/src/domain/latexSource';
import { useLatexDocumentPreview } from '@/src/presentation/hooks/useLatexDocumentPreview';
import type { RichTextFormat } from '@/src/domain/models';

export function RichContentRenderer(props: { format: RichTextFormat; content: string }) {
  if (props.format === 'latex') {
    return <LatexDocumentRenderer content={props.content} />;
  }

  return <MarkdownContentRenderer content={props.content} />;
}

function MarkdownContentRenderer(props: { content: string }) {
  return (
    <div className="content-renderer">
      <ReactMarkdown remarkPlugins={[remarkGfm, remarkMath]} rehypePlugins={[rehypeKatex]}>
        {props.content}
      </ReactMarkdown>
    </div>
  );
}

function LatexDocumentRenderer(props: { content: string }) {
  const preview = useLatexDocumentPreview(props.content);
  const latexMode = detectLatexSourceMode(props.content);

  if (!props.content.trim()) {
    return <div className="preview-empty-state compact">Add LaTeX content to render the compiled document preview.</div>;
  }

  if (preview.status === 'loading') {
    return (
      <div className="latex-preview-status">
        Compiling {latexMode === 'document' ? 'LaTeX document' : 'LaTeX fragment'} preview...
      </div>
    );
  }

  if (preview.status === 'error') {
    const heading =
      preview.kind === 'render_failed'
        ? 'LaTeX preview rendering failed'
        : 'LaTeX preview failed';
    const detailsLabel =
      preview.kind === 'render_failed'
        ? 'View preview pipeline details'
        : 'View compiler details';

    return (
      <div className="latex-preview-error-card">
        <strong>{heading}</strong>
        <p>{preview.error}</p>
        {preview.lineNumber || preview.kind ? (
          <div className="latex-preview-meta-row">
            <span className="studio-badge studio-badge-muted">
              {preview.mode === 'document' ? 'full document' : 'fragment'}
            </span>
            {preview.lineNumber ? <span className="studio-badge studio-badge-muted">Line {preview.lineNumber}</span> : null}
            {preview.kind ? <span className="studio-badge studio-badge-muted">{preview.kind.replaceAll('_', ' ')}</span> : null}
          </div>
        ) : null}
        {preview.focus ? <p className="latex-preview-focus">Focus: <code>{preview.focus}</code></p> : null}
        {preview.hint ? <p className="latex-preview-hint">{preview.hint}</p> : null}
        {preview.diagnostics.length > 0 ? (
          <details className="latex-preview-details">
            <summary>{detailsLabel}</summary>
            <pre className="latex-preview-log">{preview.diagnostics.join('\n')}</pre>
          </details>
        ) : null}
      </div>
    );
  }

  if (preview.status === 'ready' && preview.previewUrl) {
    return (
      <div className="latex-preview-shell">
        <div className="inline premium-badge-row">
          <span className="studio-badge studio-badge-muted">
            {preview.mode === 'document' ? 'Compiled as full document' : 'Compiled as fragment'}
          </span>
        </div>
        <div className="latex-preview-canvas">
          <iframe
            className="latex-preview-frame"
            src={`${preview.previewUrl}#toolbar=0&navpanes=0&scrollbar=1`}
            title="LaTeX preview"
            loading="lazy"
          />
        </div>
      </div>
    );
  }

  return <div className="latex-preview-status">Waiting for LaTeX preview...</div>;
}


