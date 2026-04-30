'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';

export function NodeDiscussionComposer(props: {
  onSubmit: (body: string) => Promise<void> | void;
  disabled?: boolean;
  pending?: boolean;
  placeholder?: string;
  submitLabel?: string;
  compact?: boolean;
}) {
  const [body, setBody] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const next = body.trim();
    if (!next || props.disabled || props.pending) {
      return;
    }

    try {
      await props.onSubmit(next);
      setBody('');
    } catch {
      // Parent section renders the error state.
    }
  }

  return (
    <form className="stack node-discussion-composer" onSubmit={handleSubmit}>
      <TextArea
        value={body}
        disabled={props.disabled || props.pending}
        rows={props.compact ? 3 : 4}
        onChange={(event) => setBody(event.target.value)}
        placeholder={props.placeholder ?? 'Write your comment...'}
      />
      <div className="inline">
        <Button type="submit" disabled={props.disabled || props.pending || body.trim().length === 0}>
          {props.pending ? 'Saving...' : props.submitLabel ?? 'Post comment'}
        </Button>
      </div>
    </form>
  );
}


