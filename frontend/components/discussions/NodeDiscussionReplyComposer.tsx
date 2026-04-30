'use client';

import { NodeDiscussionComposer } from '@/components/discussions/NodeDiscussionComposer';

export function NodeDiscussionReplyComposer(props: {
  onSubmit: (body: string) => Promise<void> | void;
  disabled?: boolean;
  pending?: boolean;
}) {
  return (
    <NodeDiscussionComposer
      onSubmit={props.onSubmit}
      disabled={props.disabled}
      pending={props.pending}
      placeholder="Write a reply..."
      submitLabel="Reply"
      compact
    />
  );
}


