import Image from 'next/image';
import Link from 'next/link';
import { unstable_cache } from 'next/cache';
import { BookOpen, Sparkles, Users } from 'lucide-react';

import { AuthForm } from '@/components/auth/AuthForm';
import { createServiceRoleSupabaseClient } from '@/src/infrastructure/supabase/serverClient';
import { safeNextPath } from '@/src/presentation/http/routeUtils';

type AuthMode = 'signin' | 'signup';

const getAuthPageStats = unstable_cache(
  async () => {
    try {
      const supabase = createServiceRoleSupabaseClient();
      const [usersResult, coursesResult] = await Promise.all([
        supabase.from('user_profiles').select('user_id', { count: 'exact', head: true }).eq('is_banned', false),
        supabase.from('courses').select('id', { count: 'exact', head: true }).eq('status', 'published'),
      ]);

      return {
        userCount: usersResult.error ? 0 : usersResult.count ?? 0,
        courseCount: coursesResult.error ? 0 : coursesResult.count ?? 0,
      };
    } catch {
      return {
        userCount: 0,
        courseCount: 0,
      };
    }
  },
  ['auth-page-platform-stats-v1'],
  { revalidate: 300 }
);

function formatCount(value: number) {
  return new Intl.NumberFormat('en-IN').format(value);
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const resolvedSearchParams = await searchParams;
  const nextValue = resolvedSearchParams.next;
  const modeValue = resolvedSearchParams.mode;
  const nextPath = safeNextPath(typeof nextValue === 'string' ? nextValue : null);
  const initialMode: AuthMode = modeValue === 'signup' ? 'signup' : 'signin';
  const isSignup = initialMode === 'signup';
  const alternateMode: AuthMode = isSignup ? 'signin' : 'signup';
  const authPageStats = await getAuthPageStats();
  const learnerStats = [
    {
      icon: Users,
      value: formatCount(authPageStats.userCount),
      label: authPageStats.userCount === 1 ? 'Registered user' : 'Registered users',
    },
    {
      icon: BookOpen,
      value: formatCount(authPageStats.courseCount),
      label: authPageStats.courseCount === 1 ? 'Published course' : 'Published courses',
    },
  ] as const;

  function authModeHref(mode: AuthMode) {
    const params = new URLSearchParams({ mode });
    if (nextPath !== '/dashboard') {
      params.set('next', nextPath);
    }
    return `/login?${params.toString()}`;
  }

  return (
    <main className="auth-simple-shell">
      <section className="auth-simple-card" aria-label="CS Ranger authentication">
        <section className="auth-simple-left" aria-labelledby="auth-simple-title">
          <div className="auth-simple-badge">
            <Sparkles size={18} aria-hidden="true" />
            <span>{isSignup ? 'Create account' : 'Welcome back'}</span>
          </div>

          <h1 className="auth-simple-title" id="auth-simple-title">
            {isSignup ? 'Create your account and start learning today.' : 'Log in to continue your learning journey.'}
          </h1>

          <div className="auth-simple-stat-list" aria-label="Platform counts">
            {learnerStats.map((stat) => {
              const Icon = stat.icon;

              return (
                <article className="auth-simple-stat-card" key={stat.label}>
                  <Icon size={30} aria-hidden="true" />
                  <div>
                    <strong>{stat.value}</strong>
                    <span>{stat.label}</span>
                  </div>
                </article>
              );
            })}
          </div>

          <div className="auth-simple-team">
            <h2>Meet the Team</h2>
            <div className="auth-simple-founder">
              <Image src="/image.jpg" alt="Kumar Shivam" width={64} height={64} className="auth-simple-founder-image" />
              <div>
                <h3>Kumar Shivam</h3>
                <p>
                  Hi Everyone, I am Kumar Shivam, a student of IIT Kanpur. CS Ranger is built to make computer science concepts easier
                  to understand with structured courses and focused nodes.
                </p>
              </div>
            </div>
          </div>

          <div className="auth-simple-switch">
            <span>{isSignup ? 'Already have an account?' : "Don't have an account?"}</span>
            <Link href={authModeHref(alternateMode)}>{isSignup ? 'Log in' : 'Sign up'}</Link>
          </div>
        </section>

        <section className="auth-simple-right">
          <AuthForm nextPath={nextPath} initialMode={initialMode} />
        </section>
      </section>
    </main>
  );
}
