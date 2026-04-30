'use client';

import type { RichTextFormat } from '@/src/domain/models';
import { Select } from '@/components/ui/Select';

export function RichFormatSelect(props: {
  label?: string;
  value: RichTextFormat;
  onChange: (value: RichTextFormat) => void;
}) {
  return (
    <label className="field">
      <span className="field-label">{props.label ?? 'Format'}</span>
      <Select value={props.value} onChange={(event) => props.onChange(event.target.value as RichTextFormat)}>
        <option value="markdown">Markdown + LaTeX (mixed)</option>
        <option value="latex">LaTeX document mode</option>
      </Select>
      <span className="muted">
        Mixed mode supports normal markdown plus inline math <code>$...$</code> and block math <code>$$...$$</code>.
      </span>
    </label>
  );
}


