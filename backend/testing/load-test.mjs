#!/usr/bin/env node

import { getBaseUrl, loadEnv, percentile, resolveUrl, timedFetch, writeJsonReport } from './_helpers.mjs';

await loadEnv();

const args = process.argv.slice(2);
const baseUrl = readArg('--base') ?? process.env.LOAD_TEST_BASE_URL ?? getBaseUrl();
const durationMs = readNumber(readArg('--duration-ms') ?? process.env.LOAD_TEST_DURATION_MS, 15000, 1000, 600000);
const concurrency = readNumber(readArg('--concurrency') ?? process.env.LOAD_TEST_CONCURRENCY, 10, 1, 10000);
const routes = (readArg('--routes') ?? process.env.LOAD_TEST_ROUTES ?? '/,/courses,/search,/dashboard')
  .split(',')
  .map((route) => route.trim())
  .filter(Boolean);
const endAt = Date.now() + durationMs;
const timings = [];
const byRoute = Object.fromEntries(routes.map((route) => [route, { count: 0, failed: 0, timings: [] }]));

await Promise.all(Array.from({ length: concurrency }, (_, workerIndex) => worker(workerIndex)));

const report = {
  kind: 'load',
  baseUrl,
  durationMs,
  concurrency,
  routes,
  totalRequests: timings.length,
  okRequests: timings.filter((item) => item.ok).length,
  failedRequests: timings.filter((item) => !item.ok).length,
  p50Ms: percentile(timings.map((item) => item.durationMs), 50),
  p95Ms: percentile(timings.map((item) => item.durationMs), 95),
  p99Ms: percentile(timings.map((item) => item.durationMs), 99),
  maxMs: timings.length > 0 ? Math.max(...timings.map((item) => item.durationMs)) : 0,
  byRoute: Object.fromEntries(
    Object.entries(byRoute).map(([route, stats]) => [
      route,
      {
        count: stats.count,
        failed: stats.failed,
        p95Ms: percentile(stats.timings, 95),
      },
    ])
  ),
};

await writeJsonReport('latest-load.json', report, 'load');
console.log(`Load test completed: ${report.totalRequests} requests, failed=${report.failedRequests}, p95=${report.p95Ms}ms`);
console.log('Report: backend/testing/reports/latest-load.json');

async function worker(workerIndex) {
  let cursor = workerIndex;
  while (Date.now() < endAt) {
    const route = routes[cursor % routes.length];
    cursor += concurrency;
    const response = await timedFetch(resolveUrl(baseUrl, route), { method: 'GET', timeoutMs: 20000 });
    const ok = response.status !== null && response.status < 500;

    timings.push({ route, ok, durationMs: response.durationMs, status: response.status });
    byRoute[route].count += 1;
    byRoute[route].failed += ok ? 0 : 1;
    byRoute[route].timings.push(response.durationMs);
  }
}

function readArg(name) {
  const equalArg = args.find((arg) => arg.startsWith(`${name}=`));
  if (equalArg) return equalArg.slice(name.length + 1);
  const index = args.indexOf(name);
  if (index >= 0) return args[index + 1];
  return null;
}

function readNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}
