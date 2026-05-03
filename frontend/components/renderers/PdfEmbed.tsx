'use client';

import type { PdfNodePayload } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';

function isProtectedPdfSource(value: string) {
  return value.startsWith('/api/courses/') || value.startsWith('data:application/pdf;base64,');
}

function withPdfReaderControlsDisabled(value: string) {
  return `${value}#toolbar=0&navpanes=0&scrollbar=1&view=FitH`;
}

export function PdfEmbed(props: {
  payload: PdfNodePayload;
  title: string;
}) {
  const pdfUrl = props.payload.pdfUrl?.trim() ?? '';
  const canEmbed = pdfUrl.length > 0 && isProtectedPdfSource(pdfUrl);
  const protectedReaderUrl = canEmbed ? withPdfReaderControlsDisabled(pdfUrl) : '';

  return (
    <section className="node-stage-section pdf-node-reader">
      <div className="node-stage-section-header pdf-node-toolbar">
        <div>
          <div className="node-stage-section-label">Protected PDF reader</div>
          <h3 className="panel-title pdf-node-title">{props.payload.title || props.title}</h3>
          <p className="muted pdf-node-security-copy">
            Download controls are disabled. This PDF opens only inside the CS Ranger reader.
          </p>
        </div>
      </div>

      {props.payload.note ? (
        <div className="pdf-node-note">
          <RichContentRenderer format="markdown" content={props.payload.note} />
        </div>
      ) : null}

      {canEmbed ? (
        <iframe
          className="pdf-frame"
          src={protectedReaderUrl}
          title={props.payload.title || props.title}
          sandbox="allow-scripts allow-same-origin"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="empty-state">
          <h3>Secure PDF upload required.</h3>
          <p>This node must use an uploaded PDF. Public PDF links are blocked to prevent direct download exposure.</p>
        </div>
      )}
    </section>
  );
}
