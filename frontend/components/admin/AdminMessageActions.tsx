'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/src/presentation/http/client';
import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';

export function AdminMessageActions(props: {
  messageId: string;
  currentStatus: 'open' | 'reviewed' | 'closed';
  targetUserId: string | null;
  targetIsBanned: boolean;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [reason, setReason] = useState('');

  function updateStatus(status: 'open' | 'reviewed' | 'closed') {
    startTransition(async () => {
      await apiJson(`/api/admin/messages/${props.messageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      router.refresh();
    });
  }

  function moderate(actionType: 'ban' | 'unban') {
    if (!props.targetUserId) {
      return;
    }

    startTransition(async () => {
      await apiJson('/api/admin/moderation', {
        method: 'POST',
        body: JSON.stringify({
          actionType,
          targetUserId: props.targetUserId,
          sourceMessageId: props.messageId,
          reason,
        }),
      });
      router.refresh();
    });
  }

  return (
    <section className="panel stack-lg">
      <div className="stack" style={{ gap: 8 }}>
        <div className="section-label">Admin actions</div>
        <p className="muted" style={{ margin: 0 }}>
          Update message status, then apply moderation if the complaint requires it.
        </p>
      </div>

      <div className="inline">
        <Button type="button" variant={props.currentStatus === 'open' ? 'secondary' : 'ghost'} disabled={pending} onClick={() => updateStatus('open')}>Mark open</Button>
        <Button type="button" variant={props.currentStatus === 'reviewed' ? 'secondary' : 'ghost'} disabled={pending} onClick={() => updateStatus('reviewed')}>Mark reviewed</Button>
        <Button type="button" variant={props.currentStatus === 'closed' ? 'secondary' : 'ghost'} disabled={pending} onClick={() => updateStatus('closed')}>Close message</Button>
      </div>

      <label className="field">
        <span className="field-label">Moderation reason</span>
        <TextArea value={reason} onChange={(event) => setReason(event.target.value)} rows={4} placeholder="Explain why the user is being banned or unbanned." />
      </label>

      <div className="inline">
        <Button type="button" variant="danger" disabled={pending || !props.targetUserId || props.targetIsBanned} onClick={() => moderate('ban')}>Ban user</Button>
        <Button type="button" variant="secondary" disabled={pending || !props.targetUserId || !props.targetIsBanned} onClick={() => moderate('unban')}>Unban user</Button>
      </div>
    </section>
  );
}


