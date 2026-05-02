#!/usr/bin/env node

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';

const trackedFiles = execFileSync('git', ['ls-files'], { encoding: 'utf8' })
  .split('\n')
  .map((line) => line.trim())
  .filter(Boolean)
  .filter((file) => !file.includes('node_modules/'))
  .filter((file) => !file.endsWith('package-lock.json'))
  .filter((file) => !file.endsWith('tsconfig.tsbuildinfo'));

const patterns = [
  {
    name: 'Supabase session cookie',
    pattern: /sb-[a-z0-9-]+-auth-token=base64-[a-z0-9+/=_-]{40,}/i,
  },
  {
    name: 'Bearer token blob',
    pattern: /authorization["':\s]+bearer\s+[a-z0-9._-]{40,}/i,
  },
  {
    name: 'JWT blob',
    pattern: /eyJ[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}\.[a-zA-Z0-9_-]{20,}/,
  },
  {
    name: 'Provider secret assignment',
    pattern: /(SUPABASE_SERVICE_ROLE_KEY|RAZORPAY_KEY_SECRET|RAZORPAY_WEBHOOK_SECRET|RAZORPAYX_KEY_SECRET|RAZORPAYX_WEBHOOK_SECRET|API_TEST_ADMIN_PASSWORD)\s*=\s*["']?[^\s"'<>{}()[\]`$]{12,}/,
  },
  {
    name: 'Raw cookie header',
    pattern: /"cookieHeader"\s*:\s*"(?!\[redacted\])[^"]{20,}"/i,
  },
];

const findings = [];

for (const file of trackedFiles) {
  if (!fs.existsSync(file) || fs.statSync(file).isDirectory()) continue;

  const content = fs.readFileSync(file, 'utf8');
  for (const { name, pattern } of patterns) {
    const match = pattern.exec(content);
    if (match) {
      const line = content.slice(0, match.index).split(/\r?\n/).length;
      findings.push(`${file}:${line} ${name}`);
    }
  }
}

if (findings.length > 0) {
  console.error('Secret scan failed. Rotate any exposed values before deploying.');
  for (const finding of findings.slice(0, 50)) {
    console.error(`- ${finding}`);
  }
  process.exit(1);
}

console.log(`Secret scan passed across ${trackedFiles.length} tracked files.`);
