'use client';

import type { TextareaHTMLAttributes } from 'react';

import { TextArea } from '@/components/ui/TextArea';
import { cn } from '@/lib/utils';

interface CountedTextAreaFieldProps extends Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, 'onChange' | 'value'> {
  label: string;
  value: string;
  onChange: (value: string) => void;
  limit: number;
  helperText?: string;
}

export function CountedTextAreaField({
  className,
  helperText,
  label,
  limit,
  onChange,
  value,
  ...props
}: CountedTextAreaFieldProps) {
  const characterCount = value.length;
  const usage = limit > 0 ? characterCount / limit : 0;
  const tone = usage >= 0.95 ? 'danger' : usage >= 0.8 ? 'warning' : 'default';

  return (
    <label className="field">
      <span className="field-label">{label}</span>
      <TextArea
        {...props}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className={cn(className)}
      />
      <div className="field-meta-row">
        {helperText ? <span className="field-helper-text">{helperText}</span> : <span />}
        <span className="field-character-count" data-tone={tone}>
          {characterCount.toLocaleString()} / {limit.toLocaleString()} characters
        </span>
      </div>
    </label>
  );
}


