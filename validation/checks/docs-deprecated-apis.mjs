#!/usr/bin/env node

/**
 * Check: Deprecated API References in Docs
 * 
 * Parses CHANGELOG.md and changelog-archive/*.md to extract deprecated APIs.
 * Looks for:
 * - Tables with old → new mappings
 * - Code examples showing old vs new
 * - "renamed to" / "replaced by" / "removed" patterns
 * - Function/package/path changes in "Breaking changes" sections
 * 
 * Then scans docs for any usage of the old identifiers.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config.yaml');
const exampleConfigPath = join(__dirname, '..', 'config.example.yaml');

export const checkName = 'docs-deprecated-apis';

function loadConfig() {
  if (!existsSync(configPath)) {
    if (existsSync(exampleConfigPath)) {
      console.warn('\n⚠️  config.yaml not found. Copy config.example.yaml to config.yaml and update paths.\n');
    }
    return null;
  }
  return yaml.load(readFileSync(configPath, 'utf-8'));
}

// Filter out overly generic terms that cause false positives
const GENERIC_TERMS = new Set([
  'name', 'type', 'data', 'info', 'value', 'id', 'key', 'version', 
  'status', 'state', 'config', 'options', 'params', 'result', 'response',
  'request', 'error', 'message', 'description', 'title', 'auth', 'user',
  'get', 'set', 'create', 'update', 'delete', 'list', 'find'
]);

function parseChangelogForDeprecations(content) {
  const deprecated = {
    functions: new Set(),
    packages: new Set(),
    paths: new Set(),
    classes: new Set()
  };
  
  // Match markdown tables with old → new mappings
  const tablePattern = /\|([^|]+)\|([^|]+)\|[^\n]*\n\|[^|]+\|[^|]+\|[^\n]*\n((?:\|[^|]+\|[^|]+\|[^\n]*\n)+)/g;
  for (const match of content.matchAll(tablePattern)) {
    const rows = match[3].trim().split('\n');
    for (const row of rows) {
      const [, oldVal, newVal] = row.split('|').map(s => s.trim());
      if (oldVal && oldVal !== newVal) {
        // Extract identifiers from backticks
        const oldIds = oldVal.match(/`([^`]+)`/g);
        if (oldIds) {
          for (const id of oldIds) {
            const cleaned = id.replace(/`/g, '');
            if (cleaned.includes('/')) {
              deprecated.paths.add(cleaned);
            } else if (cleaned.startsWith('@')) {
              deprecated.packages.add(cleaned);
            } else if (cleaned.includes('(')) {
              deprecated.functions.add(cleaned.replace(/\(\)$/, ''));
            } else if (/^[A-Z]/.test(cleaned)) {
              deprecated.classes.add(cleaned);
            } else {
              deprecated.functions.add(cleaned);
            }
          }
        }
      }
    }
  }
  
  // Match "X renamed to Y" / "X → Y" patterns
  const renamePatterns = [
    /`([^`]+)`\s+(?:renamed to|→)\s+`([^`]+)`/g,
    /`([^`]+)`\s+\([^)]*\)\s+→\s+`([^`]+)`/g,
    /`([^`]+)`\s+replaced by\s+`([^`]+)`/g
  ];
  
  for (const pattern of renamePatterns) {
    for (const match of content.matchAll(pattern)) {
      const oldId = match[1];
      if (oldId.includes('(')) {
        deprecated.functions.add(oldId.replace(/\(\)$/, ''));
      } else if (oldId.startsWith('@')) {
        deprecated.packages.add(oldId);
      } else if (/^[A-Z]/.test(oldId)) {
        deprecated.classes.add(oldId);
      }
    }
  }
  
  // Match code blocks with // 0.0.1 vs // 0.2.0 comparisons
  const codeBlockPattern = /```[a-z]*\n([\s\S]*?)```/g;
  for (const match of content.matchAll(codeBlockPattern)) {
    const code = match[1];
    if (code.includes('// 0.0.1') || code.includes('// 0.2.0') || code.includes('// 0.4.')) {
      // Extract old version identifiers
      const lines = code.split('\n');
      let inOldSection = false;
      for (const line of lines) {
        if (line.includes('// 0.0.') || line.includes('// v0.0.')) {
          inOldSection = true;
          continue;
        }
        if (line.includes('// 0.') && !line.includes('// 0.0.')) {
          inOldSection = false;
          continue;
        }
        
        if (inOldSection) {
          // Extract function calls: functionName(
          const funcs = line.matchAll(/\b([a-z][a-zA-Z0-9_]*)\(/g);
          for (const f of funcs) {
            deprecated.functions.add(f[1]);
          }
          // Extract identifiers from destructuring: { foo, bar }
          const destructure = line.match(/\{\s*([^}]+)\s*\}/);
          if (destructure) {
            const ids = destructure[1].split(',').map(s => s.trim());
            for (const id of ids) {
              deprecated.functions.add(id);
            }
          }
        }
      }
    }
  }
  
  // Match "X removed" / "X deleted" patterns
  const removedPattern = /(?:^|\n)[-*]\s+(?:\*\*)?([^*\n]+?)(?:\*\*)?\s+(?:removed|deleted|retired)/gmi;
  for (const match of content.matchAll(removedPattern)) {
    const item = match[1].trim();
    const inBackticks = item.match(/`([^`]+)`/);
    if (inBackticks) {
      const id = inBackticks[1];
      if (id.startsWith('@')) {
        deprecated.packages.add(id);
      } else if (id.includes('(')) {
        deprecated.functions.add(id.replace(/\(\)$/, ''));
      }
    }
  }
  
  return {
    functions: Array.from(deprecated.functions),
    packages: Array.from(deprecated.packages),
    paths: Array.from(deprecated.paths),
    classes: Array.from(deprecated.classes)
  };
}

function loadDeprecatedFromChangelogs(config) {
  const allDeprecated = {
    functions: [],
    packages: [],
    paths: [],
    classes: []
  };
  
  if (!config?.source_repo?.path) {
    return allDeprecated;
  }
  
  const repoPath = config.source_repo.path;
  
  // Read current CHANGELOG.md
  const changelogPath = join(repoPath, 'CHANGELOG.md');
  if (existsSync(changelogPath)) {
    const content = readFileSync(changelogPath, 'utf-8');
    const deprecated = parseChangelogForDeprecations(content);
    allDeprecated.functions.push(...deprecated.functions);
    allDeprecated.packages.push(...deprecated.packages);
    allDeprecated.paths.push(...deprecated.paths);
    allDeprecated.classes.push(...deprecated.classes);
  }
  
  // Read archived changelogs (support both single path and array)
  let archivePaths = config.validation_sources?.changelog_archives || 
                     config.validation_sources?.changelog_archive;
  
  // Normalize to array
  if (archivePaths && !Array.isArray(archivePaths)) {
    archivePaths = [archivePaths];
  }
  
  if (archivePaths && Array.isArray(archivePaths)) {
    for (const archivePath of archivePaths) {
      if (existsSync(archivePath)) {
        const files = readdirSync(archivePath).filter(f => f.endsWith('.md'));
        for (const file of files) {
          const content = readFileSync(join(archivePath, file), 'utf-8');
          const deprecated = parseChangelogForDeprecations(content);
          allDeprecated.functions.push(...deprecated.functions);
          allDeprecated.packages.push(...deprecated.packages);
          allDeprecated.paths.push(...deprecated.paths);
          allDeprecated.classes.push(...deprecated.classes);
        }
      }
    }
  }
  
  // Deduplicate and filter
  allDeprecated.functions = [...new Set(allDeprecated.functions)]
    .filter(f => f && f.length >= 4 && !GENERIC_TERMS.has(f.toLowerCase()));
  allDeprecated.packages = [...new Set(allDeprecated.packages)]
    .filter(p => p && p.length >= 4);
  allDeprecated.paths = [...new Set(allDeprecated.paths)]
    .filter(p => p && p.length >= 4);
  allDeprecated.classes = [...new Set(allDeprecated.classes)]
    .filter(c => c && c.length >= 4 && !GENERIC_TERMS.has(c.toLowerCase()));
  
  return allDeprecated;
}

function* walkMarkdownFiles(dir) {
  try {
    const entries = readdirSync(dir);
    
    for (const entry of entries) {
      const fullPath = join(dir, entry);
      const stat = statSync(fullPath);
      
      if (stat.isDirectory()) {
        if (['.git', 'node_modules', '.next', 'out', 'dist', 'build'].includes(entry)) {
          continue;
        }
        yield* walkMarkdownFiles(fullPath);
      } else if (entry.endsWith('.md') || entry.endsWith('.mdx')) {
        yield fullPath;
      }
    }
  } catch (err) {
    // Skip unreadable directories
  }
}

function checkFileForDeprecated(filePath, deprecated) {
  const content = readFileSync(filePath, 'utf-8');
  const lines = content.split('\n');
  const violations = [];
  
  // Check deprecated functions
  for (const func of (deprecated.functions || [])) {
    if (!func || func.length < 3) continue;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(func)) {
        violations.push({
          line: i + 1,
          type: 'deprecated-function',
          term: func,
          context: lines[i].trim().substring(0, 100)
        });
      }
    }
  }
  
  // Check deprecated packages
  for (const pkg of (deprecated.packages || [])) {
    if (!pkg || pkg.length < 3) continue;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(pkg)) {
        violations.push({
          line: i + 1,
          type: 'deprecated-package',
          term: pkg,
          context: lines[i].trim().substring(0, 100)
        });
      }
    }
  }
  
  // Check deprecated classes
  for (const cls of (deprecated.classes || [])) {
    if (!cls || cls.length < 3) continue;
    for (let i = 0; i < lines.length; i++) {
      if (lines[i].includes(cls)) {
        violations.push({
          line: i + 1,
          type: 'deprecated-class',
          term: cls,
          context: lines[i].trim().substring(0, 100)
        });
      }
    }
  }
  
  return violations;
}

export async function run(targetPath) {
  const config = loadConfig();
  
  if (!config?.source_repo?.path) {
    return {
      passed: true,
      skipped: true,
      reason: 'No source_repo.path configured in config.yaml'
    };
  }
  
  const deprecated = loadDeprecatedFromChangelogs(config);
  
  if (deprecated.functions.length === 0 && deprecated.packages.length === 0 && 
      deprecated.classes.length === 0 && deprecated.paths.length === 0) {
    return {
      passed: true,
      skipped: true,
      reason: 'No deprecated APIs found in changelogs'
    };
  }
  
  const fileViolations = [];
  
  for (const mdFile of walkMarkdownFiles(targetPath)) {
    const violations = checkFileForDeprecated(mdFile, deprecated);
    
    if (violations.length > 0) {
      fileViolations.push({
        file: mdFile.replace(targetPath, '.'),
        violations
      });
    }
  }
  
  return {
    passed: fileViolations.length === 0,
    violations: fileViolations,
    summary: `Found ${deprecated.functions.length} deprecated functions, ${deprecated.packages.length} packages, ${deprecated.classes.length} classes from changelogs`
  };
}

// CLI usage
if (import.meta.url === `file://${process.argv[1]}`) {
  const targetPath = process.argv[2] || process.cwd();
  
  console.log(`🔍 Checking for deprecated API usage in: ${targetPath}\n`);
  
  const result = await run(targetPath);
  
  if (result.skipped) {
    console.log(`⚠️  Skipped: ${result.reason}`);
    process.exit(0);
  }
  
  if (result.summary) {
    console.log(`📋 ${result.summary}\n`);
  }
  
  if (result.passed) {
    console.log('✅ No deprecated APIs found in documentation');
    process.exit(0);
  } else {
    console.error('❌ Deprecated API references found:\n');
    
    for (const fileResult of result.violations) {
      console.error(`  ${fileResult.file}:`);
      for (const v of fileResult.violations) {
        console.error(`    L${v.line}: ${v.type} - "${v.term}"`);
        console.error(`      ${v.context}\n`);
      }
    }
    
    process.exit(1);
  }
}
