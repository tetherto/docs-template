#!/usr/bin/env node

/**
 * PR Validation Runner
 * 
 * Runs all validation checks against a target repository.
 * Can be run against:
 * - Local branch
 * - Local uncommitted changes
 * - Remote PR (by fetching and checking out)
 */

import { readdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const checksDir = join(__dirname, 'checks');

async function loadChecks() {
  const files = readdirSync(checksDir).filter(f => f.endsWith('.mjs'));
  const checks = [];
  
  for (const file of files) {
    const module = await import(join(checksDir, file));
    checks.push({
      name: module.checkName || file.replace('.mjs', ''),
      run: module.run,
      file
    });
  }
  
  return checks;
}

async function runAllChecks(targetPath) {
  const checks = await loadChecks();
  const results = [];
  
  console.log(`Running ${checks.length} validation check(s) on: ${targetPath}\n`);
  
  for (const check of checks) {
    console.log(`🔍 Running: ${check.name}`);
    const result = await check.run(targetPath);
    results.push({ name: check.name, ...result });
    
    if (result.passed) {
      console.log(`  ✅ Passed\n`);
    } else {
      console.log(`  ❌ Failed\n`);
    }
  }
  
  return results;
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetPath = process.argv[2] || process.cwd();
  
  const results = await runAllChecks(targetPath);
  
  const failed = results.filter(r => !r.passed);
  
  if (failed.length === 0) {
    console.log('✅ All checks passed');
    process.exit(0);
  } else {
    console.error(`\n❌ ${failed.length} check(s) failed:\n`);
    for (const result of failed) {
      console.error(`  ${result.name}`);
      if (result.violations) {
        for (const violation of result.violations) {
          console.error(`    Pattern: ${violation.pattern}`);
          for (const match of violation.matches) {
            console.error(`      ${match.file}: ${match.location}`);
          }
        }
      }
    }
    process.exit(1);
  }
}
