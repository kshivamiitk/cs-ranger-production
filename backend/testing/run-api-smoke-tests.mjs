#!/usr/bin/env node

import path from 'node:path';

import {
  discoverApiRoutes,
  getBaseUrl,
  loadEnv,
  percentile,
  readJson,
  replaceEnvTokens,
  resolveUrl,
  rootDir,
  timedFetch,
  toCookieHeader,
  writeJsonReport,
} from './_helpers.mjs';

await loadEnv();

const baseUrl = getBaseUrl();
const authMode = process.env.API_TEST_AUTH_MODE ?? 'anonymous';
const autoDiscover = process.env.API_TEST_AUTO_DISCOVER ?? 'off';
const failOnError = process.env.API_TEST_FAIL_ON_ERROR === 'true';
const endpointFile = path.join(rootDir, 'backend', 'testing', 'api-endpoints.json');
const configuredEndpoints = await readJson(endpointFile, []);
const endpoints = await buildEndpointList(configuredEndpoints);
const auth = authMode === 'admin' ? await signInAsAdmin() : { mode: authMode, ok: false, rawCookieHeader: '', note: 'Anonymous mode.' };
const startedAt = new Date().toISOString();
const results = [];

for (const endpoint of endpoints) {
  if (endpoint.skipped) {
    results.push({
      ...endpoint,
      ok: true,
      status: null,
      durationMs: 0,
      skipped: true,
    });
    continue;
  }

  const method = (endpoint.method ?? 'GET').toUpperCase();
  const headers = { Accept: 'application/json' };
  const body = endpoint.body === undefined || endpoint.skipBodyEnvReplacement
    ? endpoint.body
    : replaceEnvTokens(endpoint.body);

  if (body !== undefined && method !== 'GET' && method !== 'HEAD') {
    headers['Content-Type'] = 'application/json';
  }

  if ((endpoint.requiresAuth || endpoint.requiresAdmin || authMode === 'admin') && auth.rawCookieHeader) {
    headers.Cookie = auth.rawCookieHeader;
  }

  const response = await timedFetch(resolveUrl(baseUrl, endpoint.path), {
    method,
    headers,
    body: body === undefined || method === 'GET' || method === 'HEAD' ? undefined : JSON.stringify(body),
  });
  const expectedStatuses = normalizeExpectedStatuses(endpoint.expectedStatuses);
  const ok = response.status !== null && expectedStatuses.includes(response.status);

  results.push({
    name: endpoint.name ?? `${method} ${endpoint.path}`,
    method,
    path: endpoint.path,
    expectedStatuses,
    status: response.status,
    ok,
    durationMs: response.durationMs,
    error: response.error,
    responsePreview: response.bodyPreview,
    notes: endpoint.notes,
  });
}

const durations = results.filter((result) => !result.skipped).map((result) => result.durationMs);
const failed = results.filter((result) => !result.ok).length;
const reportAuth = {
  ...auth,
  rawCookieHeader: auth.rawCookieHeader ? '[redacted]' : '',
};
const report = {
  kind: 'api_smoke',
  baseUrl,
  authMode,
  autoDiscover,
  startedAt,
  finishedAt: new Date().toISOString(),
  total: results.length,
  failed,
  p95Ms: percentile(durations, 95),
  auth: reportAuth,
  results,
};

await writeJsonReport('latest-api-smoke.json', report, 'api-smoke');
await writeJsonReport('latest.json', report);

console.log(`API smoke completed: ${results.length - failed}/${results.length} passing, p95=${report.p95Ms}ms`);
console.log(`Report: backend/testing/reports/latest-api-smoke.json`);

if (failed > 0) {
  for (const result of results.filter((item) => !item.ok).slice(0, 8)) {
    console.log(`FAIL ${result.method} ${result.path}: status=${result.status ?? 'none'} error=${result.error ?? 'unexpected status'}`);
  }
}

if (failed > 0 && failOnError) {
  process.exit(1);
}

async function signInAsAdmin() {
  const email = process.env.API_TEST_ADMIN_EMAIL;
  const password = process.env.API_TEST_ADMIN_PASSWORD;

  if (!email || !password) {
    return {
      mode: 'admin',
      ok: false,
      cookieHeader: '',
      note: 'API_TEST_ADMIN_EMAIL/API_TEST_ADMIN_PASSWORD are required for admin auth.',
    };
  }

  const login = await timedFetch(resolveUrl(baseUrl, '/api/auth/signin'), {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ email, password, next: '/admin' }),
  });
  const cookieHeader = toCookieHeader(login.setCookies);

  return {
    mode: 'admin',
    ok: Boolean(login.status && login.status >= 200 && login.status < 400 && cookieHeader),
    cookieHeader: cookieHeader ? '[redacted]' : '',
    login: {
      email,
      status: login.status,
      ok: Boolean(login.status && login.status >= 200 && login.status < 400),
      durationMs: login.durationMs,
      setCookieCount: login.setCookies.length,
      responsePreview: login.bodyPreview,
      error: login.error,
    },
    note: cookieHeader ? `Signed in as ${email}; captured ${login.setCookies.length} cookies.` : 'Admin sign-in did not return cookies.',
    rawCookieHeader: cookieHeader,
  };
}

async function buildEndpointList(baseEndpoints) {
  if (autoDiscover === 'off' || autoDiscover === 'false') {
    return baseEndpoints;
  }

  const discoveredRoutes = await discoverApiRoutes();
  const existingKeys = new Set(baseEndpoints.map((endpoint) => `${(endpoint.method ?? 'GET').toUpperCase()} ${endpoint.path}`));
  const discoveredEndpoints = [];

  for (const route of discoveredRoutes) {
    for (const method of route.methods) {
      const key = `${method} ${route.path}`;
      if (existingKeys.has(key)) continue;

      if (route.dynamic) {
        discoveredEndpoints.push({
          name: `Dynamic route needs sample params: ${key}`,
          method,
          path: route.path,
          expectedStatuses: [],
          skipped: true,
          notes: `Provide API_TEST_PARAM_* values and add this route to api-endpoints.json to test it. Source: ${route.file}`,
        });
        continue;
      }

      const mutating = !['GET', 'HEAD', 'OPTIONS'].includes(method);
      if (autoDiscover === 'safe' && mutating) {
        discoveredEndpoints.push({
          name: `Discovered ${key}`,
          method,
          path: route.path,
          expectedStatuses: [],
          skipped: true,
          notes: `Safe mode skips auto-discovered mutating API. Add it to api-endpoints.json if you intentionally want to test it. Source: ${route.file}`,
        });
        continue;
      }

      discoveredEndpoints.push({
        name: `Discovered ${key}`,
        method,
        path: route.path,
        expectedStatuses: [200, 201, 204, 400, 401, 403, 404, 405],
        notes: `Auto-discovered from ${route.file}`,
      });
    }
  }

  return [...baseEndpoints, ...discoveredEndpoints];
}

function normalizeExpectedStatuses(expectedStatuses) {
  const base = Array.isArray(expectedStatuses) && expectedStatuses.length > 0
    ? expectedStatuses
    : [200, 201, 204, 400, 401, 403, 404, 405];
  return [...new Set([...base, 405])].sort((left, right) => left - right);
}
