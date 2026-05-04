'use client';

import type { PdfNodePayload } from '@/src/domain/models';

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
      {canEmbed ? (
        <div className="pdf-frame-bezel">
          <iframe
            className="pdf-frame"
            src={protectedReaderUrl}
            title={props.payload.title || props.title}
            referrerPolicy="no-referrer"
          />
        </div>
      ) : (
        <div className="empty-state">
          <h3>Secure PDF upload required.</h3>
          <p>This node must use an uploaded PDF. Public PDF links are blocked to prevent direct download exposure.</p>
        </div>
      )}
    </section>
  );
}
