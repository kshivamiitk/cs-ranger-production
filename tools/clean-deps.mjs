import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

const targets = [
  'node_modules',
  'frontend/node_modules',
  'frontend/.next',
  'frontend/tsconfig.tsbuildinfo',
];

for (const target of targets) {
  const absoluteTarget = path.join(rootDir, target);
  await fs.rm(absoluteTarget, { recursive: true, force: true });
  console.log(`removed ${target}`);
}

console.log('dependency caches cleaned; package-lock files were kept for reproducible installs');
