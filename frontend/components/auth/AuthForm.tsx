'use client';

import Link from 'next/link';
import { AlertCircle, CheckCircle2, LoaderCircle } from 'lucide-react';
import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';

import { apiJson } from '@/src/presentation/http/client';
import { BrandSymbol } from '@/components/brand/BrandSymbol';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import type { UserRole } from '@/src/domain/models';

type AuthMode = 'signin' | 'signup';

const modeCopy: Record<
  AuthMode,
  {
    title: string;
    subtitle: string;
    submitIdle: string;
    submitPending: string;
  }
> = {
  signin: {
    title: 'Sign in',
    subtitle: 'Return to your learning and creator workspace.',
    submitIdle: 'Continue',
    submitPending: 'Signing in...',
  },
  signup: {
    title: 'Create account',
    subtitle: 'Start with learner or creator access in the same premium shell.',
    submitIdle: 'Create account',
    submitPending: 'Creating account...',
  },
};

const roleCards: Array<{ value: UserRole; title: string; description: string }> = [
  {
    value: 'learner',
    title: 'Learner',
    description: 'Open courses, complete nodes, and progress through structured content.',
  },
  {
    value: 'creator',
    title: 'Creator',
    description: 'Build and publish polished course experiences from the creator studio.',
  },
] as const;

export function AuthForm({ nextPath }: { nextPath: string }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('signin');
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryRole, setPrimaryRole] = useState<UserRole>('learner');

  const googleHref = `/api/auth/oauth/google?${new URLSearchParams({
    next: nextPath,
    role: primaryRole,
  }).toString()}`;

  function switchMode(nextMode: AuthMode) {
    if (pending || nextMode === mode) {
      return;
    }

    setMode(nextMode);
    setError(null);
    setMessage(null);
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    startTransition(async () => {
      try {
        const endpoint = mode === 'signin' ? '/api/auth/signin' : '/api/auth/signup';
        const payload =
          mode === 'signin'
            ? { email, password, next: nextPath }
            : { fullName, username, email, password, primaryRole, next: nextPath };

        const response = await apiJson<{ redirectTo?: string; message?: string }>(endpoint, {
          method: 'POST',
          body: JSON.stringify(payload),
        });

        if (response.message) {
          setMessage(response.message);
        }

        if (response.redirectTo) {
          router.push(response.redirectTo);
          router.refresh();
        }
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : 'Authentication failed.');
      }
    });
  }

  function handleGoogleClick(event: React.MouseEvent<HTMLAnchorElement>) {
    if (pending) {
      event.preventDefault();
    }
  }

  const copy = modeCopy[mode];
  const submitText = pending ? copy.submitPending : copy.submitIdle;

  return (
    <section className="auth-form-shell" aria-labelledby="auth-form-title">
      <div className="auth-form-header">
        <div className="auth-form-brand">
          <BrandSymbol size="sm" />
          <div className="stack" style={{ gap: 4 }}>
            <span className="tag">Secure access</span>
            <span className="auth-form-brand-copy">Email or Google</span>
          </div>
        </div>

        <div className="auth-mode-toggle" role="tablist" aria-label="Authentication mode">
          <Button
            type="button"
            variant={mode === 'signin' ? 'secondary' : 'ghost'}
            className={cn('auth-mode-button', mode === 'signin' ? 'is-active' : undefined)}
            role="tab"
            aria-selected={mode === 'signin'}
            onClick={() => switchMode('signin')}
            disabled={pending}
          >
            Sign in
          </Button>
          <Button
            type="button"
            variant={mode === 'signup' ? 'secondary' : 'ghost'}
            className={cn('auth-mode-button', mode === 'signup' ? 'is-active' : undefined)}
            role="tab"
            aria-selected={mode === 'signup'}
            onClick={() => switchMode('signup')}
            disabled={pending}
          >
            Sign up
          </Button>
        </div>
      </div>

      <header className="auth-form-intro">
        <h2 id="auth-form-title" className="panel-title auth-form-title">{copy.title}</h2>
        <p className="muted auth-form-subtitle">{copy.subtitle}</p>
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
        {mode === 'signup' ? (
          <>
            <label className="field">
              <span className="field-label">Full name</span>
              <Input
                value={fullName}
                onChange={(event) => setFullName(event.target.value)}
                placeholder="Aarav Sharma"
                autoComplete="name"
                required
                disabled={pending}
              />
            </label>

            <label className="field">
              <span className="field-label">Username</span>
              <Input
                value={username}
                onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                placeholder="aarav_sharma"
                autoComplete="username"
                required
                disabled={pending}
              />
              <p className="muted" style={{ margin: '8px 0 0' }}>This unique username is how other creators find you for course collaboration.</p>
            </label>
          </>
        ) : null}

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

        <label className="field">
          <span className="field-label">Password</span>
          <Input
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
            required
            disabled={pending}
          />
        </label>

        {mode === 'signup' ? (
          <fieldset className="auth-role-fieldset">
            <legend className="field-label">Primary role</legend>
            <p className="auth-role-note">This role is also used when creating an account through Google.</p>
            <div className="auth-role-grid">
              {roleCards.map((role) => (
                <label key={role.value} className={cn('auth-role-card', primaryRole === role.value ? 'is-active' : undefined)}>
                  <input
                    type="radio"
                    className="sr-only"
                    name="primaryRole"
                    value={role.value}
                    checked={primaryRole === role.value}
                    onChange={() => setPrimaryRole(role.value)}
                    disabled={pending}
                  />
                  <span className="auth-role-title">{role.title}</span>
                  <span className="auth-role-description">{role.description}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Button type="submit" variant="premium" className="auth-submit" disabled={pending}>
          {pending ? <LoaderCircle size={16} className="auth-submit-spinner" aria-hidden="true" /> : null}
          {submitText}
        </Button>

        {mode === 'signin' ? (
          <p className="muted" style={{ margin: 0, textAlign: 'center' }}>
            <Link href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}>Forgot password?</Link>
          </p>
        ) : null}
      </form>

      <div className="auth-divider" role="separator">
        <span>Or continue with</span>
      </div>

      <a
        href={googleHref}
        className="button button-secondary auth-google-button"
        onClick={handleGoogleClick}
        aria-disabled={pending ? 'true' : undefined}
      >
        Continue with Google
      </a>

      {mode === 'signup' ? (
        <p className="muted auth-google-hint">
          First Google sign-in creates your account using the selected role.
        </p>
      ) : null}
    </section>
  );
}


