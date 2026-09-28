#!/usr/bin/env node

/**
 * Check: No Debug Instrumentation
 * 
 * Prevents debug logging code from reaching production.
 * Specifically catches Cursor debug mode instrumentation patterns.
 * 
 * Patterns detected:
 * - fetch calls to 127.0.0.1/localhost debug endpoints
 * - X-Debug-Session-Id headers
 * - sessionId fields with 6-char hex patterns
 * - #region agent log comments
 */

import { execSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

export const checkName = 'no-debug-instrumentation';

export async function run(targetPath) {
  const violations = [];
  
  // Patterns to detect
  const patterns = [
    {
      regex: 'fetch\\([\'"]http://127\\.0\\.0\\.1:\\d+/ingest',
      description: 'localhost fetch to debug ingest endpoint'
    },
    {
      regex: 'X-Debug-Session-Id',
      description: 'debug session ID header'
    },
    {
      regex: 'sessionId:[\'"][a-f0-9]{6}[\'"]',
      description: 'debug session ID in payload'
    },
    {
      regex: '#region agent log',
      description: 'agent log code region marker'
    }
  ];

  // Check if ripgrep is available, fall back to grep
  let hasRipgrep = false;
  try {
    execSync('which rg', { stdio: 'ignore' });
    hasRipgrep = true;
  } catch {
    // Will use grep
  }

  for (const pattern of patterns) {
    try {
      const cmd = hasRipgrep
        ? `rg -n '${pattern.regex}' '${targetPath}' --type-add 'code:*.{js,jsx,ts,tsx,mjs,cjs}' -t code 2>/dev/null`
        : `grep -rn -E '${pattern.regex}' '${targetPath}' --include="*.js" --include="*.jsx" --include="*.ts" --include="*.tsx" --include="*.mjs" --include="*.cjs" 2>/dev/null`;
      
      const output = execSync(cmd, { 
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe']
      });
      
      if (output.trim()) {
        const lines = output.trim().split('\n');
        violations.push({
          pattern: pattern.description,
          matches: lines.map(line => {
            const [file, ...rest] = line.split(':');
            return {
              file: file.replace(targetPath, '.'),
              location: rest.join(':').substring(0, 100)
            };
          })
        });
      }
    } catch (err) {
      // No matches (grep/rg exits with 1 when no matches)
      // Exit code 2+ means actual error, but we'll continue with other patterns
      if (err.status > 2) {
        console.warn(`Warning: Pattern "${pattern.description}" failed to execute`);
      }
    }
  }

  return {
    passed: violations.length === 0,
    violations
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetPath = process.argv[2] || process.cwd();
  
  if (!existsSync(targetPath)) {
    console.error(`Error: Path does not exist: ${targetPath}`);
    process.exit(1);
  }

  console.log(`🔍 Checking for debug instrumentation in: ${targetPath}\n`);
  
  const result = await run(targetPath);
  
  if (result.passed) {
    console.log('✅ No debug instrumentation found');
    process.exit(0);
  } else {
    console.error('❌ Debug instrumentation detected:\n');
    for (const violation of result.violations) {
      console.error(`  Pattern: ${violation.pattern}`);
      for (const match of violation.matches) {
        console.error(`    ${match.file}: ${match.location}`);
      }
      console.error('');
    }
    process.exit(1);
  }
}
