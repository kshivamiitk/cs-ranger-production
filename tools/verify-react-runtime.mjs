import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.join(rootDir, 'frontend');
const expectedNodeVersion = (await fs.readFile(path.join(rootDir, '.nvmrc'), 'utf8')).trim();
const expectedMajor = Number(expectedNodeVersion.split('.')[0]);
const actualMajor = Number(process.versions.node.split('.')[0]);

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

function packageJsonPath(packageName) {
  return path.join(frontendDir, 'node_modules', packageName, 'package.json');
}

const frontendPackage = await readJson(path.join(frontendDir, 'package.json'));
const expectedVersions = {
  next: frontendPackage.dependencies.next,
  react: frontendPackage.dependencies.react,
  'react-dom': frontendPackage.dependencies['react-dom'],
};

const mismatches = [];

for (const [packageName, expectedVersion] of Object.entries(expectedVersions)) {
  const installedPackage = await readJson(packageJsonPath(packageName));
  if (installedPackage.version !== expectedVersion) {
    mismatches.push(`${packageName}: expected ${expectedVersion}, found ${installedPackage.version}`);
  }
  console.log(`${packageName}: ${installedPackage.version}`);
}

if (actualMajor !== expectedMajor) {
  console.warn(`warning: current Node is ${process.versions.node}, project expects ${expectedNodeVersion}`);
  console.warn('run: rehash && nvm use');
}

if (mismatches.length > 0) {
  console.error('React/Next runtime version mismatch:');
  for (const mismatch of mismatches) {
    console.error(`- ${mismatch}`);
  }
  process.exit(1);
}

console.log('React/Next runtime check passed');
