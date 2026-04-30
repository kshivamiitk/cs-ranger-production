import { cookies } from 'next/headers';
import { createServerClient, type CookieOptions } from '@supabase/ssr';
import { createClient } from '@supabase/supabase-js';

import { assertSupabaseEnv, env } from '@/lib/env';
import type { Database } from '@/types/database';

let serviceRoleSupabaseClient: ReturnType<typeof createClient<Database>> | null = null;

export async function createServerSupabaseClient(
  options?: { writeCookies?: boolean }
) {
  assertSupabaseEnv();
  const cookieStore = await cookies();

  return createServerClient<Database>(env.supabaseUrl, env.supabaseAnonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet: Array<{ name: string; value: string; options?: CookieOptions }>) {
        if (!options?.writeCookies) {
          // Server components often cannot mutate cookies. Supabase expects the method
          // to exist, so keep it present and safely ignore writes outside actions/routes.
          return;
        }

        for (const cookie of cookiesToSet) {
          try {
            cookieStore.set(cookie.name, cookie.value, cookie.options as CookieOptions);
          } catch {
            // Ignore cookie writes from non-mutable server contexts.
          }
        }
      },
    },
  });
}

export function createServiceRoleSupabaseClient() {
  assertSupabaseEnv();

  if (!env.supabaseServiceRoleKey) {
    throw new Error('Missing environment variable: SUPABASE_SERVICE_ROLE_KEY');
  }

  if (!serviceRoleSupabaseClient) {
    serviceRoleSupabaseClient = createClient<Database>(env.supabaseUrl, env.supabaseServiceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        detectSessionInUrl: false,
      },
    });
  }

  return serviceRoleSupabaseClient;
}

export type AppSupabaseClient = ReturnType<typeof createClient<Database>>;
export type AppServiceSupabaseClient = ReturnType<typeof createClient<Database>>;
