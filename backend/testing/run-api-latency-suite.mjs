#!/usr/bin/env node

import fs from 'node:fs/promises';
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
} from './_helpers.mjs';

const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);
const dynamicRoutePattern = /\[\[?(\.\.\.)?([A-Za-z0-9_]+)\]\]?/g;
const defaultOutputPath = 'backend/testing/reports/latest-api-latency-suite.json';

function printHelp() {
  console.log(`
API latency suite

Discovers frontend/app/api/**/route.ts, times every safe API route, and writes a JSON report.
Mutating methods are skipped by default so this can run against local/staging safely.

Usage:
  npm run test:api:latency:all -- [options]
  node backend/testing/run-api-latency-suite.mjs [options]

Examples:
  npm run test:api:latency:all -- --base http://localhost:3000 --repeat 5
  npm run test:api:latency:all -- --only /api/courses --repeat 20 --concurrency 4
  API_TEST_COURSE_ID=uuid API_TEST_NODE_ID=uuid npm run test:api:latency:all -- --only /api/courses
  npm run test:api:latency:all -- --cookie "sb-access-token=..." --include-mutating --payload-file backend/testing/api-latency-payloads.json

Options:
  --base <url>              Base URL. Default: API_TEST_BASE_URL/API_LATENCY_BASE_URL/NEXT_PUBLIC_SITE_URL/http://localhost:3000
  --repeat <count>          Requests per endpoint. Default: 3
  --concurrency <count>     Parallel requests per endpoint. Default: 1
  --timeout-ms <ms>         Per-request timeout. Default: 15000
  --header <name:value>     Request header. Can be repeated.
  --cookie <cookie>         Cookie header value for authenticated APIs.
  --param <name=value>      Dynamic route value, e.g. courseId=... Can be repeated.
  --only <text>             Only routes containing text. Can be repeated.
  --exclude <text>          Exclude routes containing text. Can be repeated.
  --method <method>         Only test this HTTP method. Can be repeated.
  --include-mutating        Include POST/PUT/PATCH/DELETE methods.
  --payload-file <path>     Optional JSON payload/header map for mutating endpoints.
  --output <path>           JSON report path. Default: ${defaultOutputPath}
  --no-output               Do not write a JSON report.
  --fail-p95-ms <ms>        Exit non-zero when any endpoint p95 exceeds this value.
  --fail-on-status          Exit non-zero when any tested endpoint returns non-2xx.
  --help                    Show this help.

Dynamic parameter environment names:
  API_TEST_COURSE_ID, API_TEST_NODE_ID, API_TEST_CREATOR_ID, etc.
  API_LATENCY_COURSE_ID, API_LATENCY_NODE_ID, API_LATENCY_CREATOR_ID, etc.
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
    baseUrl: null,
    repeat: readNumber(process.env.API_LATENCY_REPEAT, 3, 1, 10000),
    concurrency: readNumber(process.env.API_LATENCY_CONCURRENCY, 1, 1, 1000),
    timeoutMs: readNumber(process.env.API_LATENCY_TIMEOUT_MS, 15000, 100, 300000),
    headers: [],
    cookie: process.env.API_LATENCY_COOKIE ?? null,
    params: new Map(),
    only: [],
    exclude: [],
    methods: new Set(),
    includeMutating: process.env.API_LATENCY_INCLUDE_MUTATING === '1',
    payloadFile: process.env.API_LATENCY_PAYLOAD_FILE ?? null,
    outputPath: process.env.API_LATENCY_SUITE_OUTPUT ?? defaultOutputPath,
    writeOutput: true,
    failP95Ms: readNumber(process.env.API_LATENCY_FAIL_P95_MS, 0, 0, 300000),
    failOnStatus: false,
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

    if (arg === '--include-mutating') {
      options.includeMutating = true;
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

    if (arg.startsWith('--param')) {
      const parsed = readOption(args, index);
      const separatorIndex = parsed.value.indexOf('=');
      if (separatorIndex <= 0) {
        throw new Error(`Invalid --param "${parsed.value}". Use name=value.`);
      }
      options.params.set(parsed.value.slice(0, separatorIndex), parsed.value.slice(separatorIndex + 1));
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--only')) {
      const parsed = readOption(args, index);
      options.only.push(parsed.value);
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--exclude')) {
      const parsed = readOption(args, index);
      options.exclude.push(parsed.value);
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--method')) {
      const parsed = readOption(args, index);
      options.methods.add(parsed.value.toUpperCase());
      index = parsed.nextIndex;
      continue;
    }

    if (arg.startsWith('--payload-file')) {
      const parsed = readOption(args, index);
      options.payloadFile = parsed.value;
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

    if (arg.startsWith('--fail-p95-ms')) {
      const parsed = readOption(args, index);
      options.failP95Ms = readNumber(parsed.value, 0, 0, 300000);
      index = parsed.nextIndex;
      continue;
    }

    throw new Error(`Unknown option: ${arg}`);
  }

  return options;
}

function parseHeaders(headerList, cookie) {
  const headers = {
    Accept: 'application/json, text/plain, */*',
    'User-Agent': 'cs-ranger-api-latency-suite/1.0',
  };

  for (const header of headerList) {
    const separatorIndex = header.indexOf(':');
    if (separatorIndex <= 0) {
      throw new Error(`Invalid header "${header}". Use "Name: value".`);
    }

    const name = header.slice(0, separatorIndex).trim();
    const value = header.slice(separatorIndex + 1).trim();
    headers[name] = value;
  }

  if (cookie) {
    headers.Cookie = headers.Cookie ? `${headers.Cookie}; ${cookie}` : cookie;
  }

  return headers;
}

function redactHeaders(headerList, cookie) {
  const redactedHeaders = headerList.map((header) => {
    const separatorIndex = header.indexOf(':');
    if (separatorIndex <= 0) return '[invalid header]';
    return `${header.slice(0, separatorIndex).trim()}: [configured]`;
  });

  if (cookie) {
    redactedHeaders.push('Cookie: [configured]');
  }

  return redactedHeaders;
}

function toEnvName(paramName) {
  return paramName
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[^A-Za-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
    .toUpperCase();
}

function getParamValue(paramName, configuredParams) {
  if (configuredParams.has(paramName)) {
    return configuredParams.get(paramName);
  }

  const envName = toEnvName(paramName);
  return process.env[`API_TEST_${envName}`] ?? process.env[`API_LATENCY_${envName}`] ?? null;
}

function encodeDynamicValue(value, isCatchAll) {
  if (isCatchAll) {
    return String(value)
      .split('/')
      .filter(Boolean)
      .map((segment) => encodeURIComponent(segment))
      .join('/');
  }

  return encodeURIComponent(String(value));
}

function resolveDynamicPath(routePath, configuredParams) {
  const missingParams = [];
  const resolvedPath = routePath.replace(dynamicRoutePattern, (match, spreadOperator, paramName) => {
    const value = getParamValue(paramName, configuredParams);
    if (!value && match.startsWith('[[')) {
      return '';
    }

    if (!value) {
      missingParams.push(paramName);
      return match;
    }

    return encodeDynamicValue(value, Boolean(spreadOperator));
  });

  return {
    path: resolvedPath.replace(/\/{2,}/g, '/').replace(/\/+$/, '') || '/',
    missingParams,
  };
}

function matchesRouteFilters(routePath, method, options) {
  const searchable = `${method} ${routePath}`.toLowerCase();

  if (options.only.length > 0) {
    const hasMatch = options.only.some((pattern) => searchable.includes(pattern.toLowerCase()));
    if (!hasMatch) return false;
  }

  return !options.exclude.some((pattern) => searchable.includes(pattern.toLowerCase()));
}

function selectMethods(route, options) {
  return route.methods
    .map((method) => method.toUpperCase())
    .filter((method) => options.methods.size === 0 || options.methods.has(method));
}

function buildTargets(routes, options) {
  const targets = [];
  const skipped = [];

  for (const route of routes) {
    const selectedMethods = selectMethods(route, options);

    if (selectedMethods.length === 0) {
      continue;
    }

    for (const method of selectedMethods) {
      if (!matchesRouteFilters(route.path, method, options)) {
        continue;
      }

      if (!options.includeMutating && !safeMethods.has(method)) {
        skipped.push({
          method,
          path: route.path,
          file: route.file,
          reason: 'mutating method skipped; pass --include-mutating to test it',
        });
        continue;
      }

      const resolved = resolveDynamicPath(route.path, options.params);
      if (resolved.missingParams.length > 0) {
        skipped.push({
          method,
          path: route.path,
          file: route.file,
          reason: `missing dynamic params: ${resolved.missingParams.join(', ')}`,
        });
        continue;
      }

      targets.push({
        method,
        routePath: route.path,
        path: resolved.path,
        file: route.file,
        url: resolveUrl(options.baseUrl, resolved.path),
      });
    }
  }

  return { targets, skipped };
}

function resolveProjectPath(filePath) {
  if (!filePath) return null;
  return path.isAbsolute(filePath) ? filePath : path.join(rootDir, filePath);
}

async function loadPayloadMap(payloadFile) {
  if (!payloadFile) return {};
  const resolvedPath = resolveProjectPath(payloadFile);
  const payloadMap = await readJson(resolvedPath, {});
  return replaceEnvTokens(payloadMap && typeof payloadMap === 'object' ? payloadMap : {});
}

function normalizePayloadEntry(entry) {
  if (!entry || typeof entry !== 'object') {
    return { headers: {}, body: undefined };
  }

  const headers = {};
  if (Array.isArray(entry.headers)) {
    for (const header of entry.headers) {
      const separatorIndex = String(header).indexOf(':');
      if (separatorIndex > 0) {
        headers[String(header).slice(0, separatorIndex).trim()] = String(header).slice(separatorIndex + 1).trim();
      }
    }
  } else if (entry.headers && typeof entry.headers === 'object') {
    Object.assign(headers, entry.headers);
  }

  return {
    headers,
    body: entry.body,
  };
}

function getPayloadForTarget(payloadMap, target) {
  const keys = [
    `${target.method} ${target.path}`,
    `${target.method} ${target.routePath}`,
    target.path,
    target.routePath,
  ];

  for (const key of keys) {
    if (Object.prototype.hasOwnProperty.call(payloadMap, key)) {
      return normalizePayloadEntry(payloadMap[key]);
    }
  }

  return { headers: {}, body: undefined };
}

function buildRequestOptions(target, options, baseHeaders, payloadMap) {
  const payload = getPayloadForTarget(payloadMap, target);
  const headers = {
    ...baseHeaders,
    ...payload.headers,
  };

  let body;
  if (!safeMethods.has(target.method) && payload.body !== undefined) {
    if (typeof payload.body === 'string') {
      body = payload.body;
    } else {
      body = JSON.stringify(payload.body);
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
    }
  }

  return {
    method: target.method,
    headers,
    body,
    timeoutMs: options.timeoutMs,
  };
}

async function runEndpoint(target, options, baseHeaders, payloadMap) {
  const results = [];
  let nextAttempt = 0;
  const workerCount = Math.min(options.concurrency, options.repeat);

  async function runWorker() {
    while (nextAttempt < options.repeat) {
      const attempt = nextAttempt + 1;
      nextAttempt += 1;
      const requestOptions = buildRequestOptions(target, options, baseHeaders, payloadMap);
      const result = await timedFetch(target.url, requestOptions);

      results.push({
        attempt,
        ok: result.ok,
        status: result.status,
        statusText: result.statusText,
        durationMs: result.durationMs,
        error: result.error,
      });
    }
  }

  await Promise.all(Array.from({ length: workerCount }, () => runWorker()));

  return results.sort((left, right) => left.attempt - right.attempt);
}

function summarizeTarget(target, attempts) {
  const durations = attempts.map((attempt) => attempt.durationMs).filter((duration) => Number.isFinite(duration));
  const statusCounts = {};

  for (const attempt of attempts) {
    const statusKey = attempt.status === null ? 'ERR' : String(attempt.status);
    statusCounts[statusKey] = (statusCounts[statusKey] ?? 0) + 1;
  }

  const averageMs =
    durations.length === 0 ? 0 : Math.round(durations.reduce((sum, duration) => sum + duration, 0) / durations.length);

  return {
    method: target.method,
    path: target.path,
    routePath: target.routePath,
    file: target.file,
    url: target.url,
    attempts: attempts.length,
    ok: attempts.filter((attempt) => attempt.ok).length,
    errors: attempts.filter((attempt) => attempt.error || !attempt.ok).length,
    statuses: statusCounts,
    minMs: durations.length === 0 ? 0 : Math.min(...durations),
    avgMs: averageMs,
    p50Ms: Math.round(percentile(durations, 50)),
    p90Ms: Math.round(percentile(durations, 90)),
    p95Ms: Math.round(percentile(durations, 95)),
    maxMs: durations.length === 0 ? 0 : Math.max(...durations),
  };
}

function formatStatuses(statuses) {
  return Object.entries(statuses)
    .sort(([leftStatus], [rightStatus]) => leftStatus.localeCompare(rightStatus))
    .map(([status, count]) => `${status}:${count}`)
    .join(',');
}

function truncate(value, maxLength) {
  const text = String(value);
  if (text.length <= maxLength) return text;
  return `${text.slice(0, Math.max(0, maxLength - 1))}…`;
}

function printTable(summaries) {
  if (summaries.length === 0) {
    console.log('No endpoints were tested.');
    return;
  }

  const rows = [...summaries].sort((left, right) => right.p95Ms - left.p95Ms);
  const columns = [
    { key: 'method', label: 'METHOD', width: 7 },
    { key: 'path', label: 'PATH', width: 58 },
    { key: 'statuses', label: 'STATUS', width: 16 },
    { key: 'avgMs', label: 'AVG', width: 8 },
    { key: 'p50Ms', label: 'P50', width: 8 },
    { key: 'p95Ms', label: 'P95', width: 8 },
    { key: 'maxMs', label: 'MAX', width: 8 },
    { key: 'errors', label: 'ERR', width: 5 },
  ];

  const header = columns.map((column) => column.label.padEnd(column.width)).join('  ');
  console.log(header);
  console.log(columns.map((column) => '-'.repeat(column.width)).join('  '));

  for (const summary of rows) {
    const row = {
      ...summary,
      statuses: formatStatuses(summary.statuses),
      avgMs: `${summary.avgMs}ms`,
      p50Ms: `${summary.p50Ms}ms`,
      p95Ms: `${summary.p95Ms}ms`,
      maxMs: `${summary.maxMs}ms`,
    };

    console.log(
      columns
        .map((column) => truncate(row[column.key], column.width).padEnd(column.width))
        .join('  ')
    );
  }
}

function printSkipped(skipped) {
  if (skipped.length === 0) return;

  console.log(`\nSkipped ${skipped.length} endpoint method(s):`);
  for (const item of skipped.slice(0, 25)) {
    console.log(`- ${item.method} ${item.path}: ${item.reason}`);
  }

  if (skipped.length > 25) {
    console.log(`- ... ${skipped.length - 25} more in the JSON report`);
  }
}

async function writeReport(outputPath, report) {
  const resolvedPath = resolveProjectPath(outputPath);
  await fs.mkdir(path.dirname(resolvedPath), { recursive: true });
  await fs.writeFile(resolvedPath, `${JSON.stringify(report, null, 2)}\n`);
  return resolvedPath;
}

function buildReport(options, routes, targets, skipped, summaries, startedAt, finishedAt) {
  const slowest = [...summaries].sort((left, right) => right.p95Ms - left.p95Ms).slice(0, 10);

  return {
    generatedAt: finishedAt,
    startedAt,
    baseUrl: options.baseUrl,
    options: {
      repeat: options.repeat,
      concurrency: options.concurrency,
      timeoutMs: options.timeoutMs,
      includeMutating: options.includeMutating,
      methods: [...options.methods],
      only: options.only,
      exclude: options.exclude,
      params: Object.fromEntries([...options.params.keys()].map((paramName) => [paramName, '[configured]'])),
      headers: redactHeaders(options.headers, options.cookie),
      failP95Ms: options.failP95Ms,
      failOnStatus: options.failOnStatus,
    },
    summary: {
      discoveredRoutes: routes.length,
      testedEndpointMethods: targets.length,
      skippedEndpointMethods: skipped.length,
      slowest,
    },
    endpoints: summaries,
    skipped,
  };
}

async function main() {
  await loadEnv();

  const options = parseArgs();
  options.baseUrl = options.baseUrl ?? getBaseUrl();

  const routes = await discoverApiRoutes();
  const payloadMap = await loadPayloadMap(options.payloadFile);
  const baseHeaders = parseHeaders(options.headers, options.cookie);
  const { targets, skipped } = buildTargets(routes, options);

  const startedAt = new Date().toISOString();
  const summaries = [];

  console.log(
    `Testing ${targets.length} endpoint method(s) from ${routes.length} discovered API route(s) against ${options.baseUrl}`
  );
  console.log(`repeat=${options.repeat} concurrency=${options.concurrency} timeoutMs=${options.timeoutMs}`);

  for (const target of targets) {
    const attempts = await runEndpoint(target, options, baseHeaders, payloadMap);
    summaries.push(summarizeTarget(target, attempts));
  }

  const finishedAt = new Date().toISOString();
  const report = buildReport(options, routes, targets, skipped, summaries, startedAt, finishedAt);

  console.log('');
  printTable(summaries);
  printSkipped(skipped);

  if (options.writeOutput) {
    const reportPath = await writeReport(options.outputPath, report);
    console.log(`\nReport written to ${path.relative(rootDir, reportPath)}`);
  }

  const slowEndpoints = options.failP95Ms
    ? summaries.filter((summary) => summary.p95Ms > options.failP95Ms)
    : [];
  const failedStatuses = options.failOnStatus
    ? summaries.filter((summary) => summary.errors > 0)
    : [];

  if (slowEndpoints.length > 0) {
    console.error(`\n${slowEndpoints.length} endpoint(s) exceeded p95 threshold ${options.failP95Ms}ms.`);
  }

  if (failedStatuses.length > 0) {
    console.error(`\n${failedStatuses.length} endpoint(s) returned non-2xx status or request errors.`);
  }

  if (targets.length === 0 || slowEndpoints.length > 0 || failedStatuses.length > 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
