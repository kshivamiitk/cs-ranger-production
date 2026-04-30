#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

import { loadEnv, redact } from './_helpers.mjs';

await loadEnv();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const email = process.env.API_TEST_ADMIN_EMAIL ?? 'admin@cs-ranger.local';
const password = process.env.API_TEST_ADMIN_PASSWORD;
const fullName = process.env.API_TEST_ADMIN_FULL_NAME ?? 'CS Ranger Test Admin';
const username = normalizeUsername(process.env.API_TEST_ADMIN_USERNAME ?? 'admin_tester');
const dryRun = process.argv.includes('--dry-run');

console.log(`Supabase URL: ${redact(supabaseUrl)}`);
console.log(`Service role key: ${redact(serviceRoleKey)}`);
console.log(`Admin email: ${email}`);

if (!supabaseUrl || !serviceRoleKey || !password) {
  console.error('Missing NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, or API_TEST_ADMIN_PASSWORD.');
  process.exit(1);
}

if (dryRun) {
  console.log(`Dry run passed. Would seed admin user ${email} with username ${username}.`);
  process.exit(0);
}

const supabase = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

const user = await ensureAuthUser();
await ensureAdminProfile(user.id);

console.log(`Seeded admin user ${email} (${user.id}) with username ${username}`);

async function ensureAuthUser() {
  const created = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      full_name: fullName,
      username,
      preferred_role: 'creator',
    },
  });

  if (created.data.user) {
    return created.data.user;
  }

  const existingUser = await findUserByEmail(email);
  if (!existingUser) {
    throw new Error(created.error?.message ?? `Unable to create or find ${email}`);
  }

  const updated = await supabase.auth.admin.updateUserById(existingUser.id, {
    password,
    email_confirm: true,
    user_metadata: {
      ...existingUser.user_metadata,
      full_name: fullName,
      username,
      preferred_role: 'creator',
    },
  });

  if (updated.error) {
    throw updated.error;
  }

  return updated.data.user ?? existingUser;
}

async function findUserByEmail(targetEmail) {
  let page = 1;
  const perPage = 1000;

  while (page < 20) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage });
    if (error) throw error;

    const match = data.users.find((candidate) => candidate.email?.toLowerCase() === targetEmail.toLowerCase());
    if (match) return match;
    if (data.users.length < perPage) return null;
    page += 1;
  }

  return null;
}

async function ensureAdminProfile(userId) {
  const { error } = await supabase.from('user_profiles').upsert(
    {
      user_id: userId,
      full_name: fullName,
      username,
      primary_role: 'creator',
      theme_mode: 'dark',
      is_admin: true,
      is_banned: false,
      bio: 'Deployment smoke-test administrator.',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' }
  );

  if (error) {
    throw error;
  }
}

function normalizeUsername(value) {
  const normalized = value
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, '_')
    .replace(/_+/g, '_')
    .replace(/^[^a-z]+/, 'a')
    .slice(0, 32);

  return normalized.length >= 3 ? normalized : 'admin_tester';
}
