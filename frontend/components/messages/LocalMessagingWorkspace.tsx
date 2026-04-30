'use client';

import { useEffect, useMemo, useState } from 'react';
import { MessageSquarePlus, Shield, UserRound } from 'lucide-react';

import { Button } from '@/components/ui/Button';
import { TextArea } from '@/components/ui/TextArea';
import { Input } from '@/components/ui/Input';

type Conversation = {
  id: string;
  title: string;
  recipientType: 'creator' | 'admin';
  recipientName: string;
  messages: Array<{ sender: 'me' | 'them'; body: string; createdAt: string }>;
};

const adminDirectory = ['Admin Asha', 'Admin Ravi', 'Admin Noor'];
const creatorDirectory = ['Creator Ananya', 'Creator Vivek', 'Creator Meera'];

export function LocalMessagingWorkspace(props: {
  storageKey: string;
  roleLabel: string;
  intro: string;
}) {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [composer, setComposer] = useState('');
  const [newRecipientType, setNewRecipientType] = useState<'creator' | 'admin'>('creator');
  const [newRecipientName, setNewRecipientName] = useState(creatorDirectory[0]);
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(props.storageKey);
      if (raw) {
        const parsed = JSON.parse(raw) as Conversation[];
        setConversations(parsed);
        setActiveId(parsed[0]?.id ?? null);
      }
    } catch {
      // ignore
    }
  }, [props.storageKey]);

  useEffect(() => {
    try {
      window.localStorage.setItem(props.storageKey, JSON.stringify(conversations));
    } catch {
      // ignore
    }
  }, [conversations, props.storageKey]);

  useEffect(() => {
    setNewRecipientName(newRecipientType === 'creator' ? creatorDirectory[0] : adminDirectory[0]);
  }, [newRecipientType]);

  const activeConversation = useMemo(
    () => conversations.find((entry) => entry.id === activeId) ?? null,
    [activeId, conversations]
  );

  function createConversation() {
    if (!newSubject.trim() || !newMessage.trim()) {
      return;
    }
    const next: Conversation = {
      id: crypto.randomUUID(),
      title: newSubject.trim(),
      recipientType: newRecipientType,
      recipientName: newRecipientName,
      messages: [
        { sender: 'me', body: newMessage.trim(), createdAt: new Date().toISOString() },
        { sender: 'them', body: `Auto-reply from ${newRecipientName}: we received your message and will continue the thread here.`, createdAt: new Date().toISOString() },
      ],
    };
    setConversations((current) => [next, ...current]);
    setActiveId(next.id);
    setNewSubject('');
    setNewMessage('');
  }

  function sendReply() {
    if (!activeConversation || !composer.trim()) {
      return;
    }
    setConversations((current) => current.map((entry) => (
      entry.id === activeConversation.id
        ? {
            ...entry,
            messages: [...entry.messages, { sender: 'me', body: composer.trim(), createdAt: new Date().toISOString() }],
          }
        : entry
    )));
    setComposer('');
  }

  return (
    <section className="panel stack-lg messaging-shell">
      <div className="panel-header">
        <div>
          <h2 className="panel-title">{props.roleLabel} messages</h2>
          <p className="muted" style={{ margin: '8px 0 0' }}>{props.intro}</p>
        </div>
        <span className="studio-badge studio-badge-muted">{conversations.length} thread{conversations.length === 1 ? '' : 's'}</span>
      </div>

      <div className="messaging-grid">
        <aside className="messaging-sidebar stack">
          <div className="card stack" style={{ gap: 12 }}>
            <div className="inline premium-badge-row">
              <span className="studio-badge studio-badge-primary"><MessageSquarePlus size={13} />New conversation</span>
            </div>
            <label className="field">
              <span className="field-label">Recipient type</span>
              <select className="input" value={newRecipientType} onChange={(event) => setNewRecipientType(event.target.value as 'creator' | 'admin')}>
                <option value="creator">Creator</option>
                <option value="admin">Admin</option>
              </select>
            </label>
            <label className="field">
              <span className="field-label">Recipient</span>
              <select className="input" value={newRecipientName} onChange={(event) => setNewRecipientName(event.target.value)}>
                {(newRecipientType === 'creator' ? creatorDirectory : adminDirectory).map((entry) => (
                  <option key={entry} value={entry}>{entry}</option>
                ))}
              </select>
            </label>
            <Input value={newSubject} onChange={(event) => setNewSubject(event.target.value)} placeholder="Subject" />
            <TextArea rows={4} value={newMessage} onChange={(event) => setNewMessage(event.target.value)} placeholder="Write your first message" />
            <Button type="button" onClick={createConversation}>Start thread</Button>
          </div>

          <div className="stack">
            {conversations.map((conversation) => (
              <button
                key={conversation.id}
                type="button"
                className="card messaging-thread-link"
                data-active={conversation.id === activeId}
                onClick={() => setActiveId(conversation.id)}
              >
                <div className="inline premium-badge-row" style={{ justifyContent: 'space-between' }}>
                  <span className={`studio-badge ${conversation.recipientType === 'admin' ? 'studio-badge-warning' : 'studio-badge-primary'}`}>
                    {conversation.recipientType === 'admin' ? <Shield size={12} /> : <UserRound size={12} />}
                    {conversation.recipientType}
                  </span>
                  <span className="studio-badge studio-badge-muted">{conversation.messages.length}</span>
                </div>
                <strong>{conversation.title}</strong>
                <p className="muted" style={{ margin: 0 }}>{conversation.recipientName}</p>
              </button>
            ))}
            {conversations.length === 0 ? <div className="empty-state">No conversations yet. Start a new thread with a creator or a selected admin.</div> : null}
          </div>
        </aside>

        <section className="messaging-stage card stack">
          {activeConversation ? (
            <>
              <div className="panel-header">
                <div>
                  <h3 className="panel-title" style={{ marginBottom: 6 }}>{activeConversation.title}</h3>
                  <p className="muted" style={{ margin: 0 }}>{activeConversation.recipientName} · {activeConversation.recipientType}</p>
                </div>
              </div>
              <div className="messaging-thread-scroll">
                {activeConversation.messages.map((message, index) => (
                  <article key={index} className={`messaging-bubble ${message.sender === 'me' ? 'is-me' : 'is-them'}`}>
                    <p style={{ margin: 0 }}>{message.body}</p>
                    <span className="muted">{new Date(message.createdAt).toLocaleString()}</span>
                  </article>
                ))}
              </div>
              <div className="stack" style={{ gap: 12 }}>
                <TextArea rows={4} value={composer} onChange={(event) => setComposer(event.target.value)} placeholder="Reply in this thread" />
                <div className="inline premium-badge-row" style={{ justifyContent: 'flex-end' }}>
                  <Button type="button" onClick={sendReply}>Send reply</Button>
                </div>
              </div>
            </>
          ) : (
            <div className="empty-state">Select a conversation from the left or start a new thread.</div>
          )}
        </section>
      </div>
    </section>
  );
}


