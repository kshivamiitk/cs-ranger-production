"use client";

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/src/presentation/http/client';
import type { AdminBroadcast } from '@/src/server/adminBroadcasts';

export function AdminBroadcastComposer(props: { broadcasts: AdminBroadcast[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [title, setTitle] = useState('Platform announcement');
  const [body, setBody] = useState('This message will be delivered to the selected audience through the notifications inbox.');
  const [imageUrl, setImageUrl] = useState('');
  const [ctaLabel, setCtaLabel] = useState('Open update');
  const [ctaHref, setCtaHref] = useState('/dashboard/notifications');
  const [audience, setAudience] = useState<'all' | 'learners' | 'creators' | 'admins'>('all');
  const [isActive, setIsActive] = useState(true);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await apiJson('/api/admin/broadcasts', {
          method: 'POST',
          body: JSON.stringify({ title, body, imageUrl, ctaLabel, ctaHref, audience, isActive }),
        });
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to publish broadcast.');
      }
    });
  }

  return (
    <section className="admin-broadcast-grid">
      <form className="panel stack-lg" onSubmit={handleSubmit}>
        <div className="stack-gap-8">
          <h2 className="panel-title text-no-margin">Broadcast composer</h2>
          <p className="muted text-no-margin">Publish a platform-wide notification for the selected audience.</p>
        </div>

        <label className="field">
          <span className="field-label">Title</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>

        <label className="field">
          <span className="field-label">Body</span>
          <textarea className="input textarea-resize-vertical" rows={6} value={body} onChange={(event) => setBody(event.target.value)} />
        </label>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">Audience</span>
            <select className="input" value={audience} onChange={(event) => setAudience(event.target.value as 'all' | 'learners' | 'creators' | 'admins')}>
              <option value="all">All users</option>
              <option value="learners">Learners only</option>
              <option value="creators">Creators only</option>
              <option value="admins">Admins only</option>
            </select>
          </label>
          <label className="field">
            <span className="field-label">Image URL / data URL</span>
            <input className="input" value={imageUrl} onChange={(event) => setImageUrl(event.target.value)} />
          </label>
        </div>

        <div className="grid-2">
          <label className="field">
            <span className="field-label">CTA label</span>
            <input className="input" value={ctaLabel} onChange={(event) => setCtaLabel(event.target.value)} />
          </label>
          <label className="field">
            <span className="field-label">CTA href</span>
            <input className="input" value={ctaHref} onChange={(event) => setCtaHref(event.target.value)} />
          </label>
        </div>

        <label className="field inline admin-intro-checkbox-row">
          <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
          <span className="field-label field-label-inline">Set this broadcast active immediately</span>
        </label>

        {error ? <div className="form-feedback-error">{error}</div> : null}

        <button type="submit" className="button" disabled={pending}>
          {pending ? 'Publishing...' : 'Publish broadcast'}
        </button>
      </form>

      <section className="panel stack-lg">
        <div className="stack-gap-8">
          <h2 className="panel-title text-no-margin">Recent broadcasts</h2>
          <p className="muted text-no-margin">Active broadcasts are also surfaced in notifications for the matching audience.</p>
        </div>

        {props.broadcasts.length === 0 ? (
          <div className="empty-state">No broadcasts yet.</div>
        ) : (
          <div className="editorial-list">
            {props.broadcasts.map((broadcast) => (
              <article key={broadcast.id} className="editorial-list-item editorial-list-item-feed admin-broadcast-item">
                <div className="notifications-meta-row">
                  <div className="inline premium-badge-row">
                    <span className="studio-badge studio-badge-primary">broadcast</span>
                    <span className="studio-badge studio-badge-muted">{broadcast.audience}</span>
                    <span className={broadcast.isActive ? 'studio-badge studio-badge-primary' : 'studio-badge studio-badge-muted'}>
                      {broadcast.isActive ? 'active' : 'inactive'}
                    </span>
                  </div>
                  <span className="studio-badge studio-badge-muted">{new Date(broadcast.updatedAt).toLocaleString()}</span>
                </div>
                <h3 className="panel-title text-no-margin">{broadcast.title}</h3>
                <p className="muted text-no-margin">{broadcast.body}</p>
                {broadcast.ctaLabel && broadcast.ctaHref ? (
                  <a href={broadcast.ctaHref} className="button button-ghost">{broadcast.ctaLabel}</a>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </section>
    </section>
  );
}


