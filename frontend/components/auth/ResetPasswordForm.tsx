'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, LoaderCircle } from 'lucide-react';
import { useState, useTransition } from 'react';

import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { apiJson } from '@/src/presentation/http/client';

export function ResetPasswordForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }

    startTransition(async () => {
      try {
        const response = await apiJson<{ redirectTo?: string }>('/api/auth/reset-password', {
          method: 'POST',
          body: JSON.stringify({ password, next: nextPath }),
        });
        if (response.redirectTo) {
          router.push(response.redirectTo);
          router.refresh();
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Could not update password.');
      }
    });
  }

  return (
    <section className="auth-form-shell" aria-labelledby="reset-password-title">
      <div className="auth-form-header">
        <div className="auth-form-brand">
          <BrandSymbol size="sm" />
          <div className="stack" style={{ gap: 4 }}>
            <span className="tag">Account recovery</span>
            <span className="auth-form-brand-copy">New password</span>
          </div>
        </div>
      </div>

      <header className="auth-form-intro">
        <h2 id="reset-password-title" className="panel-title auth-form-title">
          Set a new password
        </h2>
        <p className="muted auth-form-subtitle">Choose a strong password you have not used elsewhere.</p>
      </header>

      {error ? (
        <div className="auth-feedback auth-feedback-error" role="alert" aria-live="polite">
          <AlertCircle size={18} aria-hidden="true" />
          <span>{error}</span>
        </div>
      ) : null}

      <form className="auth-input-stack" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field-label">New password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
          />
        </label>

        <label className="field">
          <span className="field-label">Confirm password</span>
          <Input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            autoComplete="new-password"
            minLength={8}
            required
            disabled={pending}
          />
        </label>

        <Button type="submit" variant="premium" className="auth-submit" disabled={pending}>
          {pending ? <LoaderCircle size={16} className="auth-submit-spinner" aria-hidden="true" /> : null}
          Update password
        </Button>
      </form>

      <p className="muted" style={{ marginTop: 16 }}>
        <Link href="/login" className="button button-ghost" style={{ padding: 0 }}>
          Back to sign in
        </Link>
      </p>
    </section>
  );
}


