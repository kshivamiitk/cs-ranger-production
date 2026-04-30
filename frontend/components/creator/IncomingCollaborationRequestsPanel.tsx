'use client';

import { useState } from 'react';

import { Button } from '@/components/ui/Button';
import { apiJson } from '@/src/presentation/http/client';

export function IncomingCollaborationRequestsPanel(props: {
  invites: Array<{
    id: string;
    courseId: string;
    courseTitle: string | null;
    inviter: { fullName: string | null; username?: string | null } | null;
    message: string | null;
  }>;
}) {
  const [items, setItems] = useState(props.invites);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function respond(inviteId: string, action: 'accept' | 'decline') {
    setPendingId(inviteId);
    setError(null);
    try {
      await apiJson(`/api/creator/collaboration-requests/${inviteId}/${action}`, { method: 'POST' });
      setItems((current) => current.filter((invite) => invite.id !== inviteId));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Request failed.');
    } finally {
      setPendingId(null);
    }
  }

  if (items.length === 0) {
    return null;
  }

  return (
    <section className="panel stack-lg">
      <div>
        <h2 className="panel-title">Incoming collaboration requests</h2>
        <p className="muted">Accepting makes the course appear in your creator dashboard as a course you collaborate on.</p>
      </div>

      <div className="stack" style={{ gap: 12 }}>
        {items.map((invite) => (
          <div key={invite.id} className="card">
            <div className="panel-header">
              <div>
                <strong>{invite.courseTitle ?? 'Untitled course'}</strong>
                <p className="muted" style={{ margin: '8px 0 0' }}>
                  Invited by {invite.inviter?.fullName ?? 'Creator'} {invite.inviter?.username ? `(@${invite.inviter.username})` : ''}
                </p>
                {invite.message ? <p className="muted" style={{ margin: '8px 0 0' }}>{invite.message}</p> : null}
              </div>
              <div className="inline" style={{ gap: 10 }}>
                <Button type="button" variant="secondary" onClick={() => void respond(invite.id, 'accept')} disabled={pendingId === invite.id}>Accept</Button>
                <Button type="button" variant="ghost" onClick={() => void respond(invite.id, 'decline')} disabled={pendingId === invite.id}>Decline</Button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {error ? <div className="studio-inline-alert">{error}</div> : null}
    </section>
  );
}


