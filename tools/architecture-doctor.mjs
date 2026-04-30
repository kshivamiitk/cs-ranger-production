import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const requiredPaths = [
  'backend',
  'database',
  'frontend/app',
  'frontend/components',
  'frontend/package.json',
  'shared/config/appConfig.ts',
];

let failed = false;

for (const relativePath of requiredPaths) {
  try {
    await fs.access(path.join(rootDir, relativePath));
    console.log(`ok ${relativePath}`);
  } catch {
    failed = true;
    console.error(`missing ${relativePath}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('architecture doctor passed');
