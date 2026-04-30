#!/usr/bin/env node

import path from 'node:path';

import { reportsDir, readJson } from './_helpers.mjs';

const reports = [
  ['API smoke', 'latest-api-smoke.json'],
  ['API latency', 'latest-api-latency.json'],
  ['Load', 'latest-load.json'],
];

let printed = false;

for (const [label, fileName] of reports) {
  const report = await readJson(path.join(reportsDir, fileName));
  if (!report) continue;
  printed = true;

  console.log(`\n${label}`);
  console.log(`- kind: ${report.kind ?? 'unknown'}`);
  console.log(`- baseUrl: ${report.baseUrl ?? 'n/a'}`);

  if (typeof report.total === 'number') {
    console.log(`- total: ${report.total}`);
  }
  if (typeof report.failed === 'number') {
    console.log(`- failed: ${report.failed}`);
  }
  if (typeof report.p95Ms === 'number') {
    console.log(`- p95: ${report.p95Ms}ms`);
  }
  if (typeof report.totalRequests === 'number') {
    console.log(`- requests: ${report.totalRequests}`);
    console.log(`- failed requests: ${report.failedRequests ?? 0}`);
  }

  const failures = Array.isArray(report.results) ? report.results.filter((result) => !result.ok).slice(0, 8) : [];
  for (const failure of failures) {
    console.log(`  FAIL ${failure.method ?? ''} ${failure.path ?? failure.url ?? ''}: ${failure.status ?? failure.error ?? 'unknown'}`);
  }
}

if (!printed) {
  console.log('No reports found yet. Run npm run test:api or npm run test:api:latency first.');
}
