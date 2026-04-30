#!/usr/bin/env node

import fs from 'node:fs/promises';
import path from 'node:path';

import { rootDir } from './_helpers.mjs';

const checks = [
  ['database/supabase/migrations/033_v22_8_2_learner_creator_fast_reads.sql', 'v_course_overview_read_model'],
  ['database/supabase/migrations/033_v22_8_2_learner_creator_fast_reads.sql', 'courses_status_created_idx'],
  ['database/supabase/migrations/034_v22_8_3_creator_free_content_policy.sql', 'courses_creator_free_policy_idx'],
  ['database/supabase/migrations/035_v22_8_4_api_latency_hot_path_indexes.sql', 'create index if not exists'],
];

let failed = false;

for (const [relativePath, expectedText] of checks) {
  const filePath = path.join(rootDir, relativePath);
  try {
    const content = await fs.readFile(filePath, 'utf8');
    if (!content.includes(expectedText)) {
      failed = true;
      console.error(`missing "${expectedText}" in ${relativePath}`);
    } else {
      console.log(`ok ${relativePath}: ${expectedText}`);
    }
  } catch {
    failed = true;
    console.error(`missing ${relativePath}`);
  }
}

if (failed) {
  process.exit(1);
}

console.log('database index migration check passed');
