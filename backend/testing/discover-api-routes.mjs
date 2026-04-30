#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { discoverApiRoutes, rootDir } from './_helpers.mjs';

const routes = await discoverApiRoutes();
const outputPath = path.join(rootDir, 'backend', 'testing', 'discovered-api-routes.json');
await fs.writeFile(outputPath, `${JSON.stringify(routes, null, 2)}\n`);

console.log(`Discovered ${routes.length} API route files.`);
console.log('Wrote backend/testing/discovered-api-routes.json');
