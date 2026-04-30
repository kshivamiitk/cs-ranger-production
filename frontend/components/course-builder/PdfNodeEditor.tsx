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
      alert('For this simple node flow, keep uploaded PDFs below 4 MB. For production scale, store PDFs in Supabase Storage/CDN and paste the public URL here.');
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
          <h3 className="panel-title" style={{ margin: 0 }}>Upload or link a PDF lesson</h3>
          <p className="muted" style={{ margin: '8px 0 0' }}>
            Learners will read this PDF inside the course node. Use a CDN/Supabase Storage URL for large production files.
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

      <label className="field">
        <span className="field-label">PDF URL</span>
        <Input
          value={props.payload.pdfUrl}
          onChange={(event) => update('pdfUrl', event.target.value)}
          placeholder="https://cdn.example.com/notes.pdf"
          required
        />
        <span className="muted">A public PDF URL is the fastest and most scalable option.</span>
      </label>

      <div className="field stack" style={{ gap: 10 }}>
        <span className="field-label">Or upload a small PDF for testing</span>
        <label className="button button-secondary profile-photo-upload-button">
          <input type="file" accept="application/pdf,.pdf" onChange={handlePdfSelected} className="sr-only" />
          Upload PDF into this node
        </label>
        <span className="muted">This stores the PDF as a data URL in the node payload. Use only for small tests.</span>
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

