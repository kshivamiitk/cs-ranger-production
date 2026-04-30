'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState, useTransition } from 'react';

import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiJson } from '@/src/presentation/http/client';

export function ForgotPasswordForm({ nextPath }: { nextPath: string }) {
  const [email, setEmail] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const response = await apiJson<{ message?: string }>('/api/auth/forgot-password', {
          method: 'POST',
          body: JSON.stringify({ email, next: nextPath }),
        });
        if (response.message) {
          setMessage(response.message);
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Something went wrong.');
      }
    });
  }

  return (
    <section className="auth-form-shell" aria-labelledby="forgot-password-title">
      <div className="auth-form-header">
        <div className="auth-form-brand">
          <BrandSymbol size="sm" />
          <div className="stack" style={{ gap: 4 }}>
            <span className="tag">Account recovery</span>
            <span className="auth-form-brand-copy">Password reset</span>
          </div>
        </div>
      </div>

      <header className="auth-form-intro">
        <h2 id="forgot-password-title" className="panel-title auth-form-title">
          Forgot password
        </h2>
        <p className="muted auth-form-subtitle">
          Enter the email you use to sign in. We will send a secure link to choose a new password.
        </p>
      </header>

      {message ? (
        <div className="auth-feedback auth-feedback-success" role="status" aria-live="polite">
          <CheckCircle2 size={18} aria-hidden="true" />
          <span>{message}</span>
        </div>
      ) : null}
      {error ? (
        <div className="auth-feedback auth-feedback-error" role="alert" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <form className="auth-input-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">Email address</span>
          <Input
            type="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            placeholder="you@example.com"
            autoComplete="email"
            required
            disabled={pending}
          />
        </label>

        <Button type="submit" variant="premium" className="auth-submit" disabled={pending}>
          {pending ? <LoaderCircle size={16} className="auth-submit-spinner" aria-hidden="true" /> : null}
          Send reset link
        </Button>
      </form>

      <p className="muted" style={{ marginTop: 16 }}>
        <Link href={`/login?next=${encodeURIComponent(nextPath)}`} className="button button-ghost" style={{ padding: 0 }}>
          Back to sign in
        </Link>
      </p>
    </section>
  );
}


