"use client";

import Link from 'next/link';
import { useEffect, useMemo, useRef, useState, useTransition, type FormEvent } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { ImagePlus, Pencil, Trash2 } from 'lucide-react';

import { apiJson } from '@/src/presentation/http/client';
import type { SupportAdminOption, SupportThreadDetail, SupportThreadListItem, SupportThreadMessage } from '@/src/server/adminSupport';
import { UserAvatar } from '@/components/user/UserAvatar';
import { cn } from '@/lib/utils';

async function fileToDataUrl(file: File) {
  return await new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(new Error('Unable to read selected image.'));
    reader.readAsDataURL(file);
  });
}

export function SupportWorkspace(props: {
  viewerId: string;
  viewerName: string;
  viewerIsAdmin: boolean;
  admins: SupportAdminOption[];
  threads: SupportThreadListItem[];
  activeThread: SupportThreadDetail | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [createMode, setCreateMode] = useState(!props.activeThread && !props.viewerIsAdmin);
  const [selectedAdminId, setSelectedAdminId] = useState(props.admins[0]?.userId ?? '');
  const [category, setCategory] = useState<'complaint' | 'suggestion'>('suggestion');
  const [subject, setSubject] = useState('');
  const [body, setBody] = useState('');
  const [createImage, setCreateImage] = useState<string | null>(null);
  const [reply, setReply] = useState('');
  const [replyImage, setReplyImage] = useState<string | null>(null);
  const [editingMessageId, setEditingMessageId] = useState<string | null>(null);
  const [editingBody, setEditingBody] = useState('');
  const [editingImage, setEditingImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [statusPending, setStatusPending] = useState(false);
  const [messageActionPending, setMessageActionPending] = useState(false);
  const chatScrollRef = useRef<HTMLDivElement | null>(null);

  const activeId = props.activeThread?.id ?? searchParams.get('thread');
  const filters = useMemo(() => (props.viewerIsAdmin ? ['all', 'complaint', 'suggestion', 'open', 'resolved', 'closed'] : ['all']), [props.viewerIsAdmin]);
  const filter = searchParams.get('filter') ?? 'all';
  const filteredThreads = props.threads.filter((thread) => {
    if (filter === 'all') return true;
    if (filter === 'complaint' || filter === 'suggestion') return thread.category === filter;
    return thread.status === filter;
  });
  const totalUnreadCount = filteredThreads.reduce((sum, thread) => sum + (thread.unreadCount ?? 0), 0);
  const activeCounterpartyName = props.activeThread
    ? props.viewerIsAdmin
      ? (props.activeThread.senderProfile?.fullName ?? 'Learner')
      : (props.activeThread.targetAdmin?.fullName ?? 'Admin support')
    : null;
  const activeCounterpartyAvatar = props.activeThread
    ? props.viewerIsAdmin
      ? (props.activeThread.senderProfile?.profilePhotoUrl ?? null)
      : (props.activeThread.targetAdmin?.profilePhotoUrl ?? null)
    : null;

  useEffect(() => {
    setCreateMode(!props.activeThread && !props.viewerIsAdmin);
  }, [props.activeThread, props.viewerIsAdmin]);

  useEffect(() => {
    if (!chatScrollRef.current) return;
    chatScrollRef.current.scrollTop = chatScrollRef.current.scrollHeight;
  }, [props.activeThread?.id, props.activeThread?.messages.length]);

  function updateSearch(next: Record<string, string | null | undefined>) {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(next).forEach(([key, value]) => {
      if (!value) params.delete(key);
      else params.set(key, value);
    });
    const query = params.toString();
    router.push(query ? `${pathname}?${query}` : pathname);
  }

  function beginEdit(message: SupportThreadMessage) {
    setEditingMessageId(message.id);
    setEditingBody(message.isDeleted ? '' : message.body);
    setEditingImage(message.attachmentImageUrl ?? null);
    setError(null);
  }

  function cancelEdit() {
    setEditingMessageId(null);
    setEditingBody('');
    setEditingImage(null);
  }

  async function handleCreate(event: FormEvent) {
    event.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        const response = await apiJson<{ thread: { id: string } }>(`/api/support/threads`, {
          method: 'POST',
          body: JSON.stringify({ targetAdminUserId: selectedAdminId, category, subject, message: body, attachmentImageUrl: createImage }),
        });
        setSubject('');
        setBody('');
        setCreateImage(null);
        setCreateMode(false);
        router.push(`${pathname}?thread=${response.thread.id}`);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to create support thread.');
      }
    });
  }

  async function handleReply(event: FormEvent) {
    event.preventDefault();
    const activeThread = props.activeThread;
    if (!activeThread) return;
    setError(null);
    startTransition(async () => {
      try {
        await apiJson(`/api/support/threads/${activeThread.id}/messages`, {
          method: 'POST',
          body: JSON.stringify({ body: reply, attachmentImageUrl: replyImage }),
        });
        setReply('');
        setReplyImage(null);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to send reply.');
      }
    });
  }

  async function handleEditSubmit(event: FormEvent) {
    event.preventDefault();
    if (!props.activeThread || !editingMessageId) return;
    setMessageActionPending(true);
    setError(null);
    try {
      await apiJson(`/api/support/threads/${props.activeThread.id}/messages/${editingMessageId}`, {
        method: 'PATCH',
        body: JSON.stringify({ body: editingBody, attachmentImageUrl: editingImage }),
      });
      cancelEdit();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update message.');
    } finally {
      setMessageActionPending(false);
    }
  }

  async function handleDeleteMessage(messageId: string) {
    if (!props.activeThread) return;
    setMessageActionPending(true);
    setError(null);
    try {
      await apiJson(`/api/support/threads/${props.activeThread.id}/messages/${messageId}`, {
        method: 'DELETE',
      });
      if (editingMessageId === messageId) cancelEdit();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to delete message.');
    } finally {
      setMessageActionPending(false);
    }
  }

  async function handleStatus(status: 'open' | 'resolved' | 'closed') {
    if (!props.activeThread) return;
    setStatusPending(true);
    setError(null);
    try {
      await apiJson(`/api/support/threads/${props.activeThread.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : 'Unable to update thread status.');
    } finally {
      setStatusPending(false);
    }
  }

  function renderMessage(message: SupportThreadMessage) {
    if (!props.activeThread) return null;
    const messageFromThreadSender = message.senderUserId === props.activeThread.senderUserId;
    const senderName = messageFromThreadSender
      ? (props.activeThread.senderProfile?.fullName ?? 'Sender')
      : (props.activeThread.targetAdmin?.fullName ?? 'Admin');
    const messageRoleLabel = message.senderUserId === props.viewerId ? 'You' : (messageFromThreadSender ? 'Learner' : 'Admin');
    const rowClassName = cn(
      'v18-support-message-row',
      messageFromThreadSender ? 'is-thread-sender' : 'is-thread-recipient'
    );
    const bubbleClassName = cn(
      'v18-support-message-bubble',
      messageFromThreadSender ? 'is-thread-sender' : 'is-thread-recipient',
      message.isDeleted ? 'is-deleted' : undefined
    );
    const isEditing = editingMessageId === message.id;
    const canEdit = !message.isDeleted && message.senderUserId === props.viewerId && props.activeThread.status !== 'closed';
    const canDelete = !message.isDeleted && (message.senderUserId === props.viewerId || props.viewerIsAdmin);

    if (isEditing) {
      return (
        <div key={message.id} className={rowClassName}>
          <form className={cn(bubbleClassName, 'v18-support-edit-card')} onSubmit={handleEditSubmit}>
            <div className="v18-support-message-sender">Editing {senderName}</div>
            <textarea
              className="input v18-support-composer-input"
              value={editingBody}
              onChange={(event) => setEditingBody(event.target.value)}
              rows={4}
              placeholder="Update your message"
            />
            {editingImage ? <img src={editingImage} alt="Edited attachment preview" className="v18-support-attachment-preview" /> : null}
            <div className="v18-support-composer-actions">
              <label className="button button-ghost v18-support-attach-button">
                <ImagePlus size={16} />
                <span>{editingImage ? 'Change image' : 'Attach image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setEditingImage(await fileToDataUrl(file));
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : 'Unable to attach image.');
                    }
                  }}
                />
              </label>
              <div className="v18-support-composer-action-group">
                {editingImage ? <button type="button" className="button button-ghost" onClick={() => setEditingImage(null)}>Remove image</button> : null}
                <button type="button" className="button button-ghost" onClick={cancelEdit}>Cancel</button>
                <button type="submit" className="button" disabled={messageActionPending || (editingBody.trim().length < 2 && !editingImage)}>Save</button>
              </div>
            </div>
          </form>
        </div>
      );
    }

    return (
      <div key={message.id} className={rowClassName}>
        <article className={bubbleClassName}>
          <div className="v18-support-message-header">
            <div className="stack stack-gap-4">
              <div className="v18-support-message-sender">{senderName}</div>
              <div className="v18-support-message-role">{messageRoleLabel}</div>
            </div>
            {(canEdit || canDelete) ? (
              <div className="v18-support-message-actions">
                {canEdit ? (
                  <button type="button" className="button button-ghost v18-support-icon-button" onClick={() => beginEdit(message)}>
                    <Pencil size={15} />
                    <span>Edit</span>
                  </button>
                ) : null}
                {canDelete ? (
                  <button type="button" className="button button-ghost v18-support-icon-button" onClick={() => handleDeleteMessage(message.id)}>
                    <Trash2 size={15} />
                    <span>Delete</span>
                  </button>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="v18-support-message-body">{message.body}</div>
          {message.attachmentImageUrl ? <img src={message.attachmentImageUrl} alt="Support attachment" className="v18-support-attachment" /> : null}
          <div className="v18-support-message-meta">
            <span>{message.createdAtLabel}</span>
            {message.editedAt ? <span className="studio-badge studio-badge-muted">edited</span> : null}
            {message.isDeleted ? <span className="studio-badge studio-badge-muted">deleted</span> : null}
          </div>
        </article>
      </div>
    );
  }

  return (
    <section className="v18-support-layout">
      <aside className="panel stack-lg v18-support-sidebar">
        <div className="v18-support-section-header">
          <div>
            <h2 className="panel-title text-no-margin">Support inbox</h2>
            <p className="muted support-subcopy">{props.viewerIsAdmin ? 'Saved support threads assigned to you.' : 'Your saved complaint and suggestion conversations.'}</p>
          </div>
          {!props.viewerIsAdmin ? (
            <button type="button" className="button" onClick={() => setCreateMode((current) => !current)}>{createMode ? 'Close' : 'New thread'}</button>
          ) : null}
        </div>

        <div className="v18-support-sidebar-summary">
          <span className="studio-badge studio-badge-muted">{filteredThreads.length} thread{filteredThreads.length === 1 ? '' : 's'}</span>
          <span className={totalUnreadCount > 0 ? 'v18-support-unread-pill is-visible' : 'v18-support-unread-pill'}>{totalUnreadCount} unread</span>
        </div>

        {props.viewerIsAdmin ? (
          <div className="v18-support-filter-row">
            {filters.map((entry) => (
              <button key={entry} type="button" className={filter === entry ? 'button' : 'button button-ghost'} onClick={() => updateSearch({ filter: entry === 'all' ? null : entry })}>
                {entry}
              </button>
            ))}
          </div>
        ) : null}

        {filteredThreads.length === 0 ? (
          <div className="empty-state">No saved support threads yet.</div>
        ) : (
          <div className="v18-support-thread-list">
            {filteredThreads.map((thread) => {
              const active = activeId === thread.id;
              return (
                <Link key={thread.id} href={`${pathname}?thread=${thread.id}${filter !== 'all' ? `&filter=${filter}` : ''}`} className={active ? 'v18-support-thread-item is-active' : 'v18-support-thread-item'}>
                  <div className="v18-support-thread-topline">
                    <div className="stack stack-gap-6">
                      <strong>{thread.subject ?? 'Untitled support thread'}</strong>
                      <span className="muted">{props.viewerIsAdmin ? (thread.senderProfile?.fullName ?? 'Learner') : (thread.targetAdmin?.fullName ?? 'Admin support')}</span>
                    </div>
                    <div className="v18-support-thread-meta-block">
                      <span className="studio-badge studio-badge-primary">{thread.category}</span>
                      {thread.unreadCount > 0 ? <span className="v18-support-thread-unread-count">{thread.unreadCount}</span> : null}
                    </div>
                  </div>
                  <p className="muted text-no-margin v18-support-thread-preview">{thread.lastMessagePreview}</p>
                  <div className="v18-support-thread-footer">
                    <span className="studio-badge studio-badge-muted">{thread.status}</span>
                    <span className="muted">{thread.updatedAtLabel}</span>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </aside>

      <section className="panel stack-lg v18-support-chat-stage">
        {props.activeThread ? (
          <>
            <div className="v18-support-chat-header">
              <div className="stack stack-gap-6">
                <div className="inline premium-badge-row">
                  <span className="studio-badge studio-badge-primary">{props.activeThread.category}</span>
                  <span className="studio-badge studio-badge-muted">{props.activeThread.status}</span>
                  {props.activeThread.unreadCount > 0 ? <span className="v18-support-unread-pill is-visible">{props.activeThread.unreadCount} unread</span> : null}
                </div>
                <h2 className="panel-title text-no-margin">{props.activeThread.subject ?? 'Untitled support thread'}</h2>
                <span className="muted">{activeCounterpartyName}</span>
              </div>
              {props.viewerIsAdmin ? (
                <div className="v18-support-status-actions">
                  <button type="button" className="button button-ghost" disabled={statusPending} onClick={() => handleStatus('open')}>Open</button>
                  <button type="button" className="button button-secondary" disabled={statusPending} onClick={() => handleStatus('resolved')}>Resolve</button>
                  <button type="button" className="button button-ghost" disabled={statusPending} onClick={() => handleStatus('closed')}>Close</button>
                </div>
              ) : null}
            </div>

            <div ref={chatScrollRef} className="v18-support-chat-scroll">
              {props.activeThread.messages.map((message) => renderMessage(message))}
            </div>

            <form className="v18-support-composer" onSubmit={handleReply}>
              <textarea value={reply} onChange={(event) => setReply(event.target.value)} placeholder="Write a reply..." rows={3} className="input v18-support-composer-input" />
              {replyImage ? <img src={replyImage} alt="Reply attachment preview" className="v18-support-attachment-preview" /> : null}
              <div className="v18-support-composer-actions">
                <label className="button button-ghost v18-support-attach-button">
                  <ImagePlus size={16} />
                  <span>{replyImage ? 'Change image' : 'Attach image'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    hidden
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      if (!file) return;
                      try {
                        setReplyImage(await fileToDataUrl(file));
                      } catch (caught) {
                        setError(caught instanceof Error ? caught.message : 'Unable to attach image.');
                      }
                    }}
                  />
                </label>
                <div className="v18-support-composer-action-group">
                  {replyImage ? <button type="button" className="button button-ghost" onClick={() => setReplyImage(null)}>Remove image</button> : null}
                  <button type="submit" className="button" disabled={pending || (reply.trim().length < 2 && !replyImage)}>Send reply</button>
                </div>
              </div>
            </form>
          </>
        ) : (
          <div className="empty-state">Select a support thread to view its saved conversation.</div>
        )}
      </section>

      <aside className="panel stack-lg v18-support-details">
        {createMode && !props.viewerIsAdmin ? (
          <form className="stack-lg" onSubmit={handleCreate}>
            <div className="stack-gap-8">
              <h2 className="panel-title text-no-margin">Contact admin</h2>
              <p className="muted text-no-margin">Create a persistent support conversation. Messages stay saved across refresh.</p>
            </div>
            <label className="field">
              <span className="field-label">Admin</span>
              <select className="input" value={selectedAdminId} onChange={(event) => setSelectedAdminId(event.target.value)}>
                {props.admins.map((admin) => (
                  <option key={admin.userId} value={admin.userId}>{admin.fullName ?? admin.userId}</option>
                ))}
              </select>
            </label>
            <label className="field">
              <span className="field-label">Category</span>
              <select className="input" value={category} onChange={(event) => setCategory(event.target.value as 'complaint' | 'suggestion')}>
                <option value="suggestion">Suggestion</option>
                <option value="complaint">Complaint</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Subject</span>
              <input className="input" value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short summary" />
            </label>
            <label className="field">
              <span className="field-label">First message</span>
              <textarea className="input v18-support-create-input" value={body} onChange={(event) => setBody(event.target.value)} rows={6} placeholder="Describe your complaint or suggestion." />
            </label>
            {createImage ? <img src={createImage} alt="Support thread attachment preview" className="v18-support-attachment-preview" /> : null}
            <div className="v18-support-composer-actions">
              <label className="button button-ghost v18-support-attach-button">
                <ImagePlus size={16} />
                <span>{createImage ? 'Change image' : 'Attach image'}</span>
                <input
                  type="file"
                  accept="image/*"
                  hidden
                  onChange={async (event) => {
                    const file = event.target.files?.[0];
                    if (!file) return;
                    try {
                      setCreateImage(await fileToDataUrl(file));
                    } catch (caught) {
                      setError(caught instanceof Error ? caught.message : 'Unable to attach image.');
                    }
                  }}
                />
              </label>
              <div className="v18-support-composer-action-group">
                {createImage ? <button type="button" className="button button-ghost" onClick={() => setCreateImage(null)}>Remove image</button> : null}
              </div>
            </div>
            {error ? <div className="form-feedback-error">{error}</div> : null}
            <button type="submit" className="button" disabled={pending || !selectedAdminId || (body.trim().length < 10 && !createImage)}>Start support thread</button>
          </form>
        ) : props.activeThread ? (
          <div className="stack-lg">
            <div className="stack-gap-8">
              <h2 className="panel-title text-no-margin">Thread details</h2>
              <p className="muted text-no-margin">Unread counts clear the moment this thread is opened, just like a real chat inbox.</p>
            </div>
            <div className="card stack v18-support-thread-summary-card">
              <div className="v18-support-thread-summary-top">
                <UserAvatar src={activeCounterpartyAvatar} name={activeCounterpartyName ?? 'Support'} alt={activeCounterpartyName ?? 'Support'} />
                <div className="stack stack-gap-4">
                  <strong>{activeCounterpartyName ?? 'Support'}</strong>
                  <span className="muted">{props.activeThread.category} · {props.activeThread.status}</span>
                </div>
              </div>
              <div className="muted">Created {props.activeThread.createdAtLabel}</div>
              <div className="muted">Updated {props.activeThread.updatedAtLabel}</div>
              <div className="muted">Messages: {props.activeThread.messages.length}</div>
              {!props.viewerIsAdmin ? <button type="button" className="button button-ghost" onClick={() => setCreateMode(true)}>New thread</button> : null}
            </div>
          </div>
        ) : (
          <div className="empty-state">Use this side panel to start a support conversation with an admin.</div>
        )}
        {error && props.activeThread ? <div className="form-feedback-error">{error}</div> : null}
      </aside>
    </section>
  );
}

