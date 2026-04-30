import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { performance } from 'node:perf_hooks';

export const testingDir = path.dirname(fileURLToPath(import.meta.url));
export const backendDir = path.resolve(testingDir, '..');
export const rootDir = path.resolve(backendDir, '..');
export const reportsDir = path.join(testingDir, 'reports');

export async function pathExists(filePath) {
  try {
    await fs.access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function loadEnv() {
  for (const relativePath of ['.env', 'frontend/.env']) {
    const filePath = path.join(rootDir, relativePath);
    if (!(await pathExists(filePath))) continue;

    const content = await fs.readFile(filePath, 'utf8');
    for (const rawLine of content.split(/\r?\n/)) {
      const line = rawLine.trim();
      if (!line || line.startsWith('#')) continue;
      const match = line.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/);
      if (!match) continue;

      const [, key, rawValue] = match;
      if (process.env[key] !== undefined) continue;
      process.env[key] = unwrapEnvValue(rawValue);
    }
  }
}

function unwrapEnvValue(rawValue) {
  const value = rawValue.trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

export function getBaseUrl() {
  return normalizeBaseUrl(
    process.env.API_TEST_BASE_URL ??
      process.env.API_LATENCY_BASE_URL ??
      process.env.NEXT_PUBLIC_SITE_URL ??
      'http://localhost:3000'
  );
}

export function normalizeBaseUrl(value) {
  const trimmed = String(value || '').trim();
  if (!trimmed) return 'http://localhost:3000';
  if (/^https?:\/\//i.test(trimmed)) return trimmed.replace(/\/+$/, '');
  return 'http://localhost:3000';
}

export function resolveUrl(baseUrl, routePath) {
  if (/^https?:\/\//i.test(routePath)) return routePath;
  return new URL(routePath.startsWith('/') ? routePath : `/${routePath}`, baseUrl).toString();
}

export async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

export async function writeJsonReport(fileName, report, timestampPrefix = null) {
  await fs.mkdir(reportsDir, { recursive: true });
  const latestPath = path.join(reportsDir, fileName);
  await fs.writeFile(latestPath, `${JSON.stringify(report, null, 2)}\n`);

  if (timestampPrefix) {
    const stampedPath = path.join(reportsDir, `${timestampPrefix}-${Date.now()}.json`);
    await fs.writeFile(stampedPath, `${JSON.stringify(report, null, 2)}\n`);
  }

  return latestPath;
}

export function replaceEnvTokens(value) {
  if (typeof value === 'string') {
    return value.replace(/__([A-Z0-9_]+?)__/g, (_, key) => process.env[key] ?? '');
  }

  if (Array.isArray(value)) {
    return value.map((item) => replaceEnvTokens(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, replaceEnvTokens(item)]));
  }

  return value;
}

export function extractSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }

  const combined = headers.get('set-cookie');
  if (!combined) return [];
  return combined.split(/,(?=\s*[A-Za-z0-9_.-]+=)/).map((cookie) => cookie.trim()).filter(Boolean);
}

export function toCookieHeader(setCookies) {
  return setCookies
    .map((cookie) => cookie.split(';')[0]?.trim())
    .filter(Boolean)
    .join('; ');
}

export async function timedFetch(url, options = {}) {
  const timeoutMs = Number(options.timeoutMs ?? process.env.API_TEST_TIMEOUT_MS ?? 15000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const startedAt = performance.now();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      redirect: options.redirect ?? 'manual',
    });
    const responseText = await response.text();

    return {
      ok: response.ok,
      status: response.status,
      statusText: response.statusText,
      durationMs: Math.round(performance.now() - startedAt),
      bodyPreview: responseText.slice(0, 500),
      setCookies: extractSetCookies(response.headers),
      error: null,
    };
  } catch (error) {
    return {
      ok: false,
      status: null,
      statusText: null,
      durationMs: Math.round(performance.now() - startedAt),
      bodyPreview: '',
      setCookies: [],
      error: error instanceof Error ? error.message : String(error),
    };
  } finally {
    clearTimeout(timeout);
  }
}

export async function discoverApiRoutes() {
  const apiRoot = path.join(rootDir, 'frontend', 'app', 'api');
  const files = [];
  await walk(apiRoot, files);

  const routes = [];
  for (const filePath of files.filter((file) => file.endsWith('/route.ts'))) {
    const source = await fs.readFile(filePath, 'utf8');
    const relativeFile = path.relative(rootDir, filePath);
    const relativeRoute = path.relative(apiRoot, filePath).replace(/\/route\.ts$/, '');
    const routePath = `/api/${relativeRoute === 'route.ts' ? '' : relativeRoute}`.replace(/\/+$/, '') || '/api';
    const methods = [...source.matchAll(/export\s+async\s+function\s+(GET|POST|PUT|PATCH|DELETE|HEAD|OPTIONS)\b/g)].map(
      (match) => match[1]
    );

    routes.push({
      path: routePath,
      file: relativeFile,
      methods: methods.length > 0 ? methods : ['GET'],
      dynamic: routePath.includes('['),
    });
  }

  return routes.sort((left, right) => left.path.localeCompare(right.path));
}

async function walk(directory, files) {
  if (!(await pathExists(directory))) return;
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await walk(entryPath, files);
    } else if (entry.isFile()) {
      files.push(entryPath);
    }
  }
}

export function percentile(values, percentileValue) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((left, right) => left - right);
  const index = Math.min(sorted.length - 1, Math.ceil((percentileValue / 100) * sorted.length) - 1);
  return sorted[index];
}

export function redact(value) {
  return value ? '[configured]' : '[missing]';
}
