'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { AlertCircle, ArrowRight, AtSign, CheckCircle2, LoaderCircle, LockKeyhole, Mail, UserRound } from 'lucide-react';
import { useEffect, useState, useTransition } from 'react';

import { apiJson } from '@/src/presentation/http/client';
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
    google: string;
    switchPrompt: string;
    switchLabel: string;
  }
> = {
  signin: {
    title: 'Welcome Back',
    subtitle: 'Login to continue learning',
    submitIdle: 'Login',
    submitPending: 'Logging in...',
    google: 'Sign in with Google',
    switchPrompt: "Don't have an account?",
    switchLabel: 'Create Account',
  },
  signup: {
    title: 'Create Account',
    subtitle: 'Sign up to start learning',
    submitIdle: 'Create account',
    submitPending: 'Creating account...',
    google: 'Sign up with Google',
    switchPrompt: 'Already have an account?',
    switchLabel: 'Log in',
  },
};

const roleCards: Array<{ value: UserRole; title: string; description: string }> = [
  {
    value: 'learner',
    title: 'Learner',
    description: 'Take courses and complete nodes.',
  },
  {
    value: 'creator',
    title: 'Creator',
    description: 'Publish courses from the studio.',
  },
] as const;

export function AuthForm({ nextPath, initialMode = 'signin' }: { nextPath: string; initialMode?: AuthMode }) {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [primaryRole, setPrimaryRole] = useState<UserRole>('learner');

  useEffect(() => {
    setMode(initialMode);
    setError(null);
    setMessage(null);
  }, [initialMode]);

  const alternateMode: AuthMode = mode === 'signin' ? 'signup' : 'signin';
  const googleHref = `/api/auth/oauth/google?${new URLSearchParams({
    next: nextPath,
    role: primaryRole,
  }).toString()}`;

  function authModeHref(nextMode: AuthMode) {
    const params = new URLSearchParams({ mode: nextMode });
    if (nextPath !== '/dashboard') {
      params.set('next', nextPath);
    }
    return `/login?${params.toString()}`;
  }

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
    <section className="auth-clean-form" aria-labelledby="auth-form-title">
      <header className="auth-clean-header">
        <h2 id="auth-form-title">{copy.title}</h2>
        <p>{copy.subtitle}</p>
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

      <form className="auth-clean-stack" onSubmit={handleSubmit}>
        {mode === 'signup' ? (
          <>
            <label className="auth-clean-field">
              <span className="auth-clean-label">Full name</span>
              <span className="auth-clean-input-shell">
                <UserRound size={20} aria-hidden="true" />
                <Input
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  placeholder="Kumar Shivam"
                  autoComplete="name"
                  required
                  disabled={pending}
                />
              </span>
            </label>

            <label className="auth-clean-field">
              <span className="auth-clean-label">Username</span>
              <span className="auth-clean-input-shell">
                <AtSign size={20} aria-hidden="true" />
                <Input
                  value={username}
                  onChange={(event) => setUsername(event.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                  placeholder="kumar_shivam"
                  autoComplete="username"
                  required
                  disabled={pending}
                />
              </span>
            </label>
          </>
        ) : null}

        <label className="auth-clean-field">
          <span className="auth-clean-label">Email</span>
          <span className="auth-clean-input-shell">
            <Mail size={20} aria-hidden="true" />
            <Input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
              disabled={pending}
            />
          </span>
        </label>

        <label className="auth-clean-field">
          <span className="auth-clean-label-row">
            <span>Password</span>
            {mode === 'signin' ? <Link href={`/forgot-password?next=${encodeURIComponent(nextPath)}`}>Forgot password?</Link> : null}
          </span>
          <span className="auth-clean-input-shell">
            <LockKeyhole size={20} aria-hidden="true" />
            <Input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="••••••••"
              autoComplete={mode === 'signup' ? 'new-password' : 'current-password'}
              required
              disabled={pending}
            />
          </span>
        </label>

        {mode === 'signup' ? (
          <fieldset className="auth-clean-role-fieldset">
            <legend>Choose account type</legend>
            <div className="auth-clean-role-grid">
              {roleCards.map((role) => (
                <label key={role.value} className={cn('auth-clean-role-card', primaryRole === role.value ? 'is-active' : undefined)}>
                  <input
                    type="radio"
                    className="sr-only"
                    name="primaryRole"
                    value={role.value}
                    checked={primaryRole === role.value}
                    onChange={() => setPrimaryRole(role.value)}
                    disabled={pending}
                  />
                  <span>{role.title}</span>
                  <small>{role.description}</small>
                </label>
              ))}
            </div>
          </fieldset>
        ) : null}

        <Button type="submit" variant="premium" className="auth-clean-submit" disabled={pending}>
          {pending ? <LoaderCircle size={18} className="auth-submit-spinner" aria-hidden="true" /> : null}
          <span>{submitText}</span>
          {!pending ? <ArrowRight size={20} aria-hidden="true" /> : null}
        </Button>
      </form>

      <div className="auth-clean-divider" role="separator">
        <span>or</span>
      </div>

      <a
        href={googleHref}
        className="auth-clean-google"
        onClick={handleGoogleClick}
        aria-disabled={pending ? 'true' : undefined}
      >
        <span className="auth-google-mark" aria-hidden="true">
          G
        </span>
        <span>{copy.google}</span>
      </a>

      <p className="auth-clean-switch-line">
        <span>{copy.switchPrompt}</span>
        <Link href={authModeHref(alternateMode)} onClick={() => switchMode(alternateMode)}>
          {copy.switchLabel}
        </Link>
      </p>
    </section>
  );
}
