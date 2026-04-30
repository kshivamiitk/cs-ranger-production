'use client';

import { useEffect, useState } from 'react';

import { Modal } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { TextArea } from '@/components/ui/TextArea';

export function CreatorModuleDialogBase(props: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  submitLabel: string;
  initialTitle: string;
  initialSummary: string;
  onSubmit: (input: { title: string; summary: string }) => Promise<void>;
}) {
  const [title, setTitle] = useState(props.initialTitle);
  const [summary, setSummary] = useState(props.initialSummary);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!props.open) {
      return;
    }

    setTitle(props.initialTitle);
    setSummary(props.initialSummary);
    setError(null);
  }, [props.open, props.initialSummary, props.initialTitle]);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      await props.onSubmit({
        title,
        summary,
      });
      props.onOpenChange(false);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Module save failed.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <Modal open={props.open} onClose={() => props.onOpenChange(false)} className="modal-card-md">
      <form className="stack" onSubmit={handleSubmit}>
        <div className="modal-header">
          <div>
            <h2 className="panel-title">{props.title}</h2>
            <p className="muted">Keep modules compact here. Nodes stay managed from the module card.</p>
          </div>
        </div>

        <label className="field">
          <span className="field-label">Module title</span>
          <Input value={title} onChange={(event) => setTitle(event.target.value)} required />
        </label>

        <label className="field">
          <span className="field-label">Summary</span>
          <TextArea value={summary} onChange={(event) => setSummary(event.target.value)} required />
        </label>

        {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}

        <div className="modal-footer">
          <Button type="submit" disabled={saving}>
            {saving ? 'Saving...' : props.submitLabel}
          </Button>
          <Button type="button" variant="secondary" onClick={() => props.onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
        </div>
      </form>
    </Modal>
  );
}


