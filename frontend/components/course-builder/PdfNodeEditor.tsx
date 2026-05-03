'use client';

import type { PdfNodePayload } from '@/src/domain/models';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';

export function PdfNodeEditor(props: {
  payload: PdfNodePayload;
  onChange: (payload: PdfNodePayload) => void;
}) {
  function update<K extends keyof PdfNodePayload>(key: K, value: PdfNodePayload[K]) {
    props.onChange({ ...props.payload, [key]: value });
  }

  function handlePdfSelected(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0] ?? null;
    if (!file) {
      return;
    }

    if (file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      alert('Please select a PDF file.');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      alert('Keep uploaded PDFs below 4 MB so they can be protected inside the course reader.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        props.onChange({
          ...props.payload,
          pdfUrl: result,
          title: props.payload.title || file.name.replace(/\.pdf$/i, ''),
        });
      }
    };
    reader.readAsDataURL(file);
  }

  return (
    <section className="node-editor-panel stack-lg">
      <div className="node-editor-panel-heading">
        <div>
          <div className="section-label">PDF node</div>
          <h3 className="panel-title pdf-editor-title">Upload a protected PDF lesson</h3>
          <p className="muted pdf-editor-copy">
            Learners can read this PDF inside the course node, but direct open/download controls are not exposed.
          </p>
        </div>
      </div>

      <label className="field">
        <span className="field-label">PDF title</span>
        <Input
          value={props.payload.title ?? ''}
          onChange={(event) => update('title', event.target.value)}
          placeholder="Dynamic Programming lecture notes"
        />
      </label>

      <div className="field stack pdf-upload-field">
        <span className="field-label">Protected PDF upload</span>
        <label className="button button-secondary profile-photo-upload-button">
          <input type="file" accept="application/pdf,.pdf" onChange={handlePdfSelected} className="sr-only" />
          {props.payload.pdfUrl ? 'Replace PDF' : 'Upload PDF'}
        </label>
        <span className="muted">
          Public PDF links are disabled because they expose a direct downloadable file. Upload the PDF into this node instead.
        </span>
        {props.payload.pdfUrl ? (
          <span className="studio-badge studio-badge-success pdf-upload-status">PDF uploaded for protected reading</span>
        ) : (
          <span className="studio-badge studio-badge-warning pdf-upload-status">Upload required before saving</span>
        )}
      </div>

      <label className="field">
        <span className="field-label">Reader notes</span>
        <TextArea
          value={props.payload.note}
          onChange={(event) => update('note', event.target.value)}
          rows={6}
          placeholder="Tell learners what to focus on before reading the PDF."
          required
        />
      </label>
    </section>
  );
}
