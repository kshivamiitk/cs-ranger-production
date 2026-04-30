'use client';

import type { PdfNodePayload } from '@/src/domain/models';
import { RichContentRenderer } from '@/components/renderers/RichContentRenderer';

function isPdfLikeUrl(value: string) {
  return value.startsWith('data:application/pdf;base64,') || value.toLowerCase().includes('.pdf') || value.startsWith('http');
}

export function PdfEmbed(props: {
  payload: PdfNodePayload;
  title: string;
}) {
  const pdfUrl = props.payload.pdfUrl?.trim() ?? '';
  const canEmbed = pdfUrl.length > 0 && isPdfLikeUrl(pdfUrl);

  return (
    <section className="node-stage-section pdf-node-reader">
      <div className="node-stage-section-header pdf-node-toolbar">
        <div>
          <div className="node-stage-section-label">PDF reader</div>
          <h3 className="panel-title" style={{ margin: 0 }}>{props.payload.title || props.title}</h3>
        </div>
        {pdfUrl ? (
          <a className="button button-secondary" href={pdfUrl} target="_blank" rel="noreferrer">
            Open PDF
          </a>
        ) : null}
      </div>

      {props.payload.note ? (
        <div className="pdf-node-note">
          <RichContentRenderer format="markdown" content={props.payload.note} />
        </div>
      ) : null}

      {canEmbed ? (
        <iframe className="pdf-frame" src={pdfUrl} title={props.payload.title || props.title} />
      ) : (
        <div className="empty-state">
          <h3>No PDF configured yet.</h3>
          <p>Add a public PDF URL or upload a small test PDF in the creator editor.</p>
        </div>
      )}
    </section>
  );
}

