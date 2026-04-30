'use client';

import type { NodeType } from '@/src/domain/models';
import { Select } from '@/components/ui/Select';

const nodeTypeOptions: Array<{ value: NodeType; label: string }> = [
  { value: 'content', label: 'Content node' },
  { value: 'question', label: 'Question node' },
  { value: 'quiz', label: 'Quiz node' },
  { value: 'video', label: 'Video node' },
  { value: 'html', label: 'HTML node' },
  { value: 'pdf', label: 'PDF node' },
  { value: 'github', label: 'GitHub website node' },
];

export function NodeTypeSelect(props: {
  value: NodeType;
  onChange: (value: NodeType) => void;
  disabled?: boolean;
}) {
  return (
    <label className="field">
      <span className="field-label">Node type</span>
      <Select
        value={props.value}
        disabled={props.disabled}
        onChange={(event) => props.onChange(event.target.value as NodeType)}
      >
        {nodeTypeOptions.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </Select>
    </label>
  );
}


