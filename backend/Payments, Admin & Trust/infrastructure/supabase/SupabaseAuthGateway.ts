import type { AuthGateway, AuthResult } from '@/src/domain/ports';
import type { SessionUser } from '@/src/domain/models';
import type { AppSupabaseClient } from '@/src/infrastructure/supabase/serverClient';

function mapSessionUser(user: {
  id: string;
  email?: string | null;
  user_metadata?: Record<string, unknown>;
}): SessionUser {
  return {
    id: user.id,
    email: user.email ?? '',
    fullName: typeof user.user_metadata?.full_name === 'string' ? user.user_metadata.full_name : null,
  };
}

function isRecoverableGuestAuthError(error: { name?: string; message?: string } | null | undefined) {
  if (!error) {
    return false;
  }

  const message = error.message?.toLowerCase() ?? '';

  return (
    error.name === 'AuthSessionMissingError' ||
    message === 'auth session missing!' ||
    message.includes('invalid refresh token') ||
    message.includes('refresh token not found') ||
    message.includes('refresh token') && message.includes('invalid')
  );
}

export class SupabaseAuthGateway implements AuthGateway {
  constructor(private readonly supabase: AppSupabaseClient) {}

  async signUp(input: {
    email: string;
    password: string;
    fullName: string;
    username?: string | null;
    primaryRole: 'learner' | 'creator';
    redirectTo: string;
  }): Promise<AuthResult> {
    const { data, error } = await this.supabase.auth.signUp({
      email: input.email,
      password: input.password,
      options: {
        emailRedirectTo: input.redirectTo,
        data: {
          full_name: input.fullName,
          username: input.username ?? null,
          preferred_role: input.primaryRole,
        },
      },
    });

    if (error) {
      throw error;
    }

    return {
      user: data.session?.user ? mapSessionUser(data.session.user) : null,
      needsEmailConfirmation: !data.session,
    };
  }

  async signIn(input: { email: string; password: string }) {
    const { data, error } = await this.supabase.auth.signInWithPassword(input);
    if (error || !data.user) {
      throw error ?? new Error('Unable to sign in.');
    }

    return mapSessionUser(data.user);
  }

  async signOut() {
    const { error } = await this.supabase.auth.signOut();
    if (error) {
      if (isRecoverableGuestAuthError(error)) {
        return;
      }

      throw error;
    }
  }

  async beginGoogleOAuth(input: { redirectTo: string }) {
    const { data, error } = await this.supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: input.redirectTo,
      },
    });

    if (error || !data.url) {
      throw error ?? new Error('Google OAuth could not be started.');
    }

    return data.url;
  }

  async exchangeCodeForSession(input: { code: string }) {
    const { data, error } = await this.supabase.auth.exchangeCodeForSession(input.code);
    if (error) {
      throw error;
    }

    return data.user ? mapSessionUser(data.user) : null;
  }

  async requestPasswordReset(input: { email: string; redirectTo: string }) {
    const { error } = await this.supabase.auth.resetPasswordForEmail(input.email, {
      redirectTo: input.redirectTo,
    });
    if (error) {
      throw error;
    }
  }

  async updatePassword(input: { password: string }) {
    const { error } = await this.supabase.auth.updateUser({ password: input.password });
    if (error) {
      throw error;
    }
  }

  async getCurrentUser() {
    const { data: sessionData, error: sessionError } = await this.supabase.auth.getSession();
    if (sessionError) {
      if (isRecoverableGuestAuthError(sessionError)) {
        return null;
      }

      throw sessionError;
    }

    if (!sessionData.session?.user) {
      return null;
    }

    const { data, error } = await this.supabase.auth.getUser();
    if (error) {
      if (isRecoverableGuestAuthError(error)) {
        return null;
      }

      throw error;
    }

    return data.user ? mapSessionUser(data.user) : null;
  }
}


