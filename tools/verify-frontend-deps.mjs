import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const rootDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const frontendDir = path.join(rootDir, 'frontend');
const frontendPackagePath = path.join(frontendDir, 'package.json');

const requiredPackages = [
  'next',
  'react',
  'react-dom',
  '@supabase/ssr',
  '@supabase/supabase-js',
  'zod',
  'typescript',
];

function packageJsonPath(packageName) {
  if (packageName.startsWith('@')) {
    const [scope, name] = packageName.split('/');
    return path.join(frontendDir, 'node_modules', scope, name, 'package.json');
  }

  return path.join(frontendDir, 'node_modules', packageName, 'package.json');
}

async function readJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, 'utf8'));
}

const frontendPackage = await readJson(frontendPackagePath);
const declaredDependencies = {
  ...frontendPackage.dependencies,
  ...frontendPackage.devDependencies,
};

const missingPackages = [];

for (const packageName of requiredPackages) {
  const declaredVersion = declaredDependencies[packageName];
  const installedPath = packageJsonPath(packageName);

  try {
    const installedPackage = await readJson(installedPath);
    console.log(`${packageName}: ${installedPackage.version} installed (${declaredVersion ?? 'not declared'})`);
  } catch {
    missingPackages.push(packageName);
  }
}

if (missingPackages.length > 0) {
  console.error(`missing frontend dependencies: ${missingPackages.join(', ')}`);
  console.error('run: npm --prefix frontend install');
  process.exit(1);
}

console.log('frontend dependency check passed');
