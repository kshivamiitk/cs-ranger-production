'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/src/presentation/http/client';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { TextArea } from '@/components/ui/TextArea';

export function ContactAdminForm() {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [subject, setSubject] = useState('');
  const [messageType, setMessageType] = useState<'suggestion' | 'complaint' | 'support'>('support');
  const [targetUserId, setTargetUserId] = useState('');
  const [message, setMessage] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setSuccess(null);

    startTransition(async () => {
      try {
        await apiJson('/api/admin/messages', {
          method: 'POST',
          body: JSON.stringify({ subject, messageType, targetUserId, message }),
        });
        setSubject('');
        setTargetUserId('');
        setMessage('');
        setMessageType('support');
        setSuccess('Message sent to admin.');
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Unable to send your message.');
      }
    });
  }

  return (
    <form className="panel stack-lg" onSubmit={handleSubmit}>
      <label className="field">
        <span className="field-label">Message type</span>
        <Select value={messageType} onChange={(event) => setMessageType(event.target.value as typeof messageType)}>
          <option value="support">Support</option>
          <option value="suggestion">Suggestion</option>
          <option value="complaint">Complaint</option>
        </Select>
      </label>

      <label className="field">
        <span className="field-label">Subject</span>
        <Input value={subject} onChange={(event) => setSubject(event.target.value)} placeholder="Short summary" />
      </label>

      <label className="field">
        <span className="field-label">Target user id (optional)</span>
        <Input value={targetUserId} onChange={(event) => setTargetUserId(event.target.value)} placeholder="UUID if you are reporting a user" />
      </label>

      <label className="field">
        <span className="field-label">Message</span>
        <TextArea value={message} onChange={(event) => setMessage(event.target.value)} rows={8} required placeholder="Explain the suggestion, complaint, or support issue in enough detail for an admin to act." />
      </label>

      {success ? <div style={{ color: 'var(--success)' }}>{success}</div> : null}
      {error ? <div style={{ color: 'var(--danger)' }}>{error}</div> : null}

      <div className="inline">
        <Button type="submit" disabled={pending}>Send to admin</Button>
      </div>
    </form>
  );
}


