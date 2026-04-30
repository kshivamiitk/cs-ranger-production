#!/usr/bin/env node

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { performance } from 'node:perf_hooks';

const defaultTargets = ['/api/courses'];

function printHelp() {
  console.log(`
API latency checker

Usage:
  node backend/testing/api-latency-check.mjs [options] <api-path-or-url...>

Examples:
  node backend/testing/api-latency-check.mjs /api/courses
  node backend/testing/api-latency-check.mjs --repeat 20 --concurrency 5 /api/courses /api/profile
  node backend/testing/api-latency-check.mjs --base https://your-app.com /api/courses
  node backend/testing/api-latency-check.mjs --header "Authorization: Bearer TOKEN" https://your-app.com/api/profile
  node backend/testing/api-latency-check.mjs --cookie "sb-access-token=..." /api/profile

Options:
  --base <url>            Base URL for relative API paths. Default: http://localhost:3000
  --repeat <count>        Requests per target. Default: 5
  --concurrency <count>   Parallel requests per target. Default: 1
  --timeout-ms <ms>       Per-request timeout. Default: 10000
  --method <method>       HTTP method. Default: GET
  --header <name:value>   Request header. Can be repeated.
  --cookie <cookie>       Cookie header value for authenticated APIs.
  --body <text>           Request body for non-GET APIs.
  --json <json>           JSON request body and Content-Type header.
  --output <path>         Write JSON report. Default: backend/testing/reports/latest-api-latency.json
  --no-output             Do not write a JSON report.
  --fail-on-status        Exit non-zero for non-2xx HTTP statuses.
  --help                  Show this help.

Environment:
  API_LATENCY_BASE_URL, API_LATENCY_TARGETS, API_LATENCY_REPEAT,
  API_LATENCY_CONCURRENCY, API_LATENCY_TIMEOUT_MS, API_LATENCY_OUTPUT
`);
}

function readNumber(value, fallback, min, max) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.trunc(parsed)));
}

function readOption(args, index) {
  const current = args[index];
  const equalIndex = current.indexOf('=');
  if (equalIndex > -1) {
    return {
      value: current.slice(equalIndex + 1),
      nextIndex: index,
    };
  }

  const value = args[index + 1];
  if (!value || value.startsWith('--')) {
    throw new Error(`Missing value for ${current}`);
  }

  return {
    value,
    nextIndex: index + 1,
  };
}

function parseArgs() {
  const args = process.argv.slice(2);
  const options = {
    baseUrl: process.env.API_LATENCY_BASE_URL ?? 'http://localhost:3000',
    repeat: readNumber(process.env.API_LATENCY_REPEAT, 5, 1, 10000),
    concurrency: readNumber(process.env.API_LATENCY_CONCURRENCY, 1, 1, 1000),
    timeoutMs: readNumber(process.env.API_LATENCY_TIMEOUT_MS, 10000, 100, 300000),
    method: 'GET',
    headers: [],
    cookie: null,
    body: null,
    outputPath: process.env.API_LATENCY_OUTPUT ?? 'backend/testing/reports/latest-api-latency.json',
    writeOutput: true,
    failOnStatus: false,
    targets: [],
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];

    if (arg === '--help' || arg === '-h') {
      printHelp();
      process.exit(0);
    }

    if (arg === '--no-output') {
      options.writeOutput = false;
      continue;
    }

    if (arg === '--fail-on-status') {
      options.failOnStatus = true;
      continue;
    }

    if (arg.startsWith('--base')) {
      const parsed = readOption(args, index);
      options.baseUrl = parsed.value;
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--repeat')) {
      const parsed = readOption(args, index);
      options.repeat = readNumber(parsed.value, options.repeat, 1, 10000);
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--concurrency')) {
      const parsed = readOption(args, index);
      options.concurrency = readNumber(parsed.value, options.concurrency, 1, 1000);
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--timeout-ms')) {
      const parsed = readOption(args, index);
      options.timeoutMs = readNumber(parsed.value, options.timeoutMs, 100, 300000);
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--method')) {
      const parsed = readOption(args, index);
      options.method = parsed.value.toUpperCase();
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--header')) {
      const parsed = readOption(args, index);
      options.headers.push(parsed.value);
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--cookie')) {
      const parsed = readOption(args, index);
      options.cookie = parsed.value;
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--body')) {
      const parsed = readOption(args, index);
      options.body = parsed.value;
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--json')) {
      const parsed = readOption(args, index);
      options.body = parsed.value;
      options.headers.push('Content-Type: application/json');
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--output')) {
      const parsed = readOption(args, index);
      options.outputPath = parsed.value;
      options.writeOutput = true;
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--')) {
      throw new Error(`Unknown option: ${arg}`);
    }

    options.targets.push(arg);
  }

  if (options.targets.length === 0 && process.env.API_LATENCY_TARGETS) {
    options.targets = process.env.API_LATENCY_TARGETS
      .split(',')
      .map((target) => target.trim())
      .filter(Boolean);
  }

  if (options.targets.length === 0) {
    options.targets = defaultTargets;
  }

  return options;
}

function buildHeaders(options) {
  const headers = {};

  for (const header of options.headers) {
    const separatorIndex = header.indexOf(':');
    if (separatorIndex <= 0) {
      throw new Error(`Invalid header "${header}". Use "Name: value".`);
    }

    const name = header.slice(0, separatorIndex).trim();
    const value = header.slice(separatorIndex + 1).trim();
    headers[name] = value;
  }

  if (options.cookie) {
    headers.Cookie = headers.Cookie ? `${headers.Cookie}; ${options.cookie}` : options.cookie;
  }

  return headers;
}

function resolveTargetUrl(baseUrl, target) {
  if (/^https?:\/\//i.test(target)) {
    return target;
  }

  const normalizedTarget = target.startsWith('/') ? target : `/${target}`;
  return new URL(normalizedTarget, baseUrl).toString();
}

async function timeRequest({ url, method, headers, body, timeoutMs }) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'HEAD' ? undefined : body,
      signal: controller.signal,
      redirect: 'manual',
    });
    const buffer = await response.arrayBuffer();
    const durationMs = performance.now() - startedAt;

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs,
      bytes: buffer.byteLength,
      error: null,
    };
  } catch (error) {
    const durationMs = performance.now() - startedAt;

    return {
      ok: false,
      status: null,
      statusText: null,
      durationMs,
      bytes: 0,
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

function percentile(sortedValues, percentileValue) {
  if (sortedValues.length === 0) return null;
  const index = Math.min(
    sortedValues.length - 1,
    Math.max(0, Math.ceil((percentileValue / 100) * sortedValues.length) - 1)
  );
  return sortedValues[index];
}

function round(value) {
  return value === null ? null : Math.round(value * 100) / 100;
}

function summarize(target, url, results) {
  const durations = results.map((result) => result.durationMs).sort((left, right) => left - right);
  const statusCounts = new Map();
  let networkErrors = 0;
  let httpErrors = 0;
  let okCount = 0;
  let totalBytes = 0;

  for (const result of results) {
    totalBytes += result.bytes;

    if (result.error) {
      networkErrors += 1;
      statusCounts.set('network_error', (statusCounts.get('network_error') ?? 0) + 1);
      continue;
    }

    const statusKey = String(result.status);
    statusCounts.set(statusKey, (statusCounts.get(statusKey) ?? 0) + 1);

    if (result.ok) {
      okCount += 1;
    } else {
      httpErrors += 1;
    }
  }

  const average = durations.length
    ? durations.reduce((sum, value) => sum + value, 0) / durations.length
    : null;

  return {
    target,
    url,
    totalRequests: results.length,
    okCount,
    httpErrors,
    networkErrors,
    statusCounts: Object.fromEntries(statusCounts),
    bytes: totalBytes,
    latencyMs: {
      min: round(durations[0] ?? null),
      avg: round(average),
      p50: round(percentile(durations, 50)),
      p90: round(percentile(durations, 90)),
      p95: round(percentile(durations, 95)),
      max: round(durations[durations.length - 1] ?? null),
    },
    samples: results.map((result, index) => ({
      run: index + 1,
      status: result.status,
      ok: result.ok,
      durationMs: round(result.durationMs),
      bytes: result.bytes,
      error: result.error,
    })),
  };
}

async function runTarget(options, target, headers) {
  const url = resolveTargetUrl(options.baseUrl, target);
  const results = [];
  let nextRun = 0;

  async function worker() {
    while (nextRun < options.repeat) {
      nextRun += 1;
      const result = await timeRequest({
        url,
        method: options.method,
        headers,
        body: options.body,
        timeoutMs: options.timeoutMs,
      });
      results.push(result);
    }
  }

  const workerCount = Math.min(options.concurrency, options.repeat);
  await Promise.all(Array.from({ length: workerCount }, () => worker()));
  return summarize(target, url, results);
}

function formatMs(value) {
  return value === null ? '-' : `${value.toFixed(2)}ms`;
}

function pad(value, width) {
  const text = String(value);
  return text.length >= width ? text : `${text}${' '.repeat(width - text.length)}`;
}

function printReport(report) {
  console.log('\nAPI latency report');
  console.log(`Base: ${report.baseUrl}`);
  console.log(`Method: ${report.method} | repeat: ${report.repeat} | concurrency: ${report.concurrency} | timeout: ${report.timeoutMs}ms\n`);

  const header = [
    pad('target', 32),
    pad('runs', 6),
    pad('ok', 5),
    pad('http', 6),
    pad('net', 5),
    pad('avg', 11),
    pad('p50', 11),
    pad('p95', 11),
    pad('max', 11),
    'statuses',
  ].join('');
  console.log(header);
  console.log('-'.repeat(header.length));

  for (const target of report.targets) {
    const statuses = Object.entries(target.statusCounts)
      .map(([status, count]) => `${status}:${count}`)
      .join(', ');

    console.log([
      pad(target.target.slice(0, 31), 32),
      pad(target.totalRequests, 6),
      pad(target.okCount, 5),
      pad(target.httpErrors, 6),
      pad(target.networkErrors, 5),
      pad(formatMs(target.latencyMs.avg), 11),
      pad(formatMs(target.latencyMs.p50), 11),
      pad(formatMs(target.latencyMs.p95), 11),
      pad(formatMs(target.latencyMs.max), 11),
      statuses,
    ].join(''));
  }

  console.log('');
}

async function main() {
  const options = parseArgs();
  const headers = buildHeaders(options);
  const startedAt = new Date();
  const targetReports = [];

  for (const target of options.targets) {
    targetReports.push(await runTarget(options, target, headers));
  }

  const report = {
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    baseUrl: options.baseUrl,
    method: options.method,
    repeat: options.repeat,
    concurrency: options.concurrency,
    timeoutMs: options.timeoutMs,
    targets: targetReports,
  };

  printReport(report);

  if (options.writeOutput) {
    const outputPath = resolve(options.outputPath);
    mkdirSync(dirname(outputPath), { recursive: true });
    writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
    console.log(`Report written: ${options.outputPath}`);
  }

  const hasNetworkErrors = targetReports.some((target) => target.networkErrors > 0);
  const hasHttpErrors = targetReports.some((target) => target.httpErrors > 0);
  process.exitCode = hasNetworkErrors || (options.failOnStatus && hasHttpErrors) ? 1 : 0;
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
