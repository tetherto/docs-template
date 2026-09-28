#!/usr/bin/env node

/**
 * Check: No Personal Paths
 * 
 * Prevents hardcoded personal filesystem paths from being committed.
 * Detects patterns like:
 * - /Users/username/...
 * - /home/username/...
 * - C:\Users\username\...
 * 
 * These expose user information and break portability.
 * Code/docs should use:
 * - Relative paths from repo root
 * - Generic placeholders like /path/to/repo
 * - Environment variables
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export const checkName = 'no-personal-paths';

// Patterns that indicate personal paths
const PERSONAL_PATH_PATTERNS = [
  /\/Users\/[^\/\s]+/g,           // macOS: /Users/username
  /\/home\/[^\/\s]+/g,            // Linux: /home/username
  /C:\\Users\\[^\\s]+/gi,         // Windows: C:\Users\username
  /\\Users\\[^\\s]+/g,            // Windows alt: \Users\username
];

// Exceptions - lines that contain these are allowed
const ALLOWED_EXCEPTIONS = [
  '/Users/<username>',            // Placeholder in docs
  '/Users/username',              // Generic example
  '/home/user',                   // Generic example
  'C:\\Users\\YourName',          // Generic example
  '/path/to/',                    // Already a placeholder
  'IMPORTANT: Update',            // Config instruction
  'Update these paths',           // Config instruction
  'your local environment',       // Config instruction
  '/Users/john',                  // Test fixture example
  '/Users/Alice',                 // Test fixture example
  '/home/bob',                    // Test fixture example
  '// Windows:',                  // Code comment
  '// Linux:',                    // Code comment
  '// macOS:',                    // Code comment
];

function shouldSkipLine(line) {
  // Skip code comments in source files
  if (line.trim().startsWith('//') || line.trim().startsWith('*')) {
    return true;
  }
  
  // Skip regex pattern definitions (lines containing regex literals)
  if (line.includes('PERSONAL_PATH_PATTERNS') || line.match(/\/.*\/[gimuy]*[,;]/)) {
    return true;
  }
  
  return ALLOWED_EXCEPTIONS.some(exception => line.includes(exception));
}

function shouldSkipFile(filePath) {
  // Skip test fixtures entirely
  return filePath.includes('test-fixtures/') || 
         filePath.includes('test-fixtures\\');
}

function* walkFiles(dir, extensions = ['.md', '.mdx', '.js', '.mjs', '.ts', '.tsx', '.json', '.yaml', '.yml']) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        // Skip common non-source directories
        if (['.git', 'node_modules', '.next', 'out', 'dist', 'build', '.cursor'].includes(entry)) {
          continue;
        }
        yield* walkFiles(fullPath, extensions);
      } else if (extensions.some(ext => entry.endsWith(ext))) {
        yield fullPath;
      }
    }
  } catch (err) {
    // Skip unreadable directories
  }
}

function checkFileForPersonalPaths(filePath) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    
    // Skip if line has an allowed exception
    if (shouldSkipLine(line)) {
      continue;
    }
    
    for (const pattern of PERSONAL_PATH_PATTERNS) {
      const matches = [...line.matchAll(pattern)];
      
      for (const match of matches) {
        const path = match[0];
        
        // Extract just the username part for reporting
        const usernameMatch = path.match(/\/(Users|home)\/([^\/\s]+)/) || 
                             path.match(/Users\\([^\\s]+)/);
        const username = usernameMatch ? usernameMatch[2] || usernameMatch[1] : 'unknown';
        
        violations.push({
          line: i + 1,
          path: path,
          username: username,
          context: line.trim().substring(0, 100)
        });
      }
    }
  }
  
  return violations;
}

export async function run(targetPath) {
  const fileViolations = [];
  
  for (const file of walkFiles(targetPath)) {
    // Skip test fixtures
    if (shouldSkipFile(file)) {
      continue;
    }
    
    const violations = checkFileForPersonalPaths(file);
    
    if (violations.length > 0) {
      fileViolations.push({
        file: file.replace(targetPath, '.'),
        violations
      });
    }
  }
  
  return {
    passed: fileViolations.length === 0,
    violations: fileViolations
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetPath = process.argv[2] || process.cwd();
  
  console.log(`🔍 Checking for personal paths in: ${targetPath}\n`);
  
  const result = await run(targetPath);
  
  if (result.passed) {
    console.log('✅ No personal paths found');
    process.exit(0);
  } else {
    console.error('❌ Personal paths detected:\n');
    
    for (const fileResult of result.violations) {
      console.error(`  ${fileResult.file}:`);
      for (const v of fileResult.violations) {
        console.error(`    L${v.line}: Exposes username "${v.username}"`);
        console.error(`      Path: ${v.path}`);
        console.error(`      ${v.context}\n`);
      }
    }
    
    console.error('\n💡 Fix: Replace with relative paths or generic placeholders like /path/to/repo');
    
    process.exit(1);
  }
}
