#!/usr/bin/env node

import { getBaseUrl, loadEnv, redact } from './_helpers.mjs';

await loadEnv();

const keys = [
  'NEXT_PUBLIC_SITE_URL',
  'NEXT_PUBLIC_SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'API_TEST_BASE_URL',
  'API_TEST_ADMIN_EMAIL',
  'API_TEST_ADMIN_PASSWORD',
  'API_TEST_AUTH_MODE',
  'API_TEST_AUTO_DISCOVER',
  'API_TEST_FAIL_ON_ERROR',
];

console.log(`Node: ${process.version}`);
console.log(`Base URL: ${getBaseUrl()}`);

for (const key of keys) {
  console.log(`${key}: ${redact(process.env[key])}`);
}
