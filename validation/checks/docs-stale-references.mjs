#!/usr/bin/env node

/**
 * Check: Stale Function/Class References
 * 
 * Finds function and class names mentioned in docs that don't exist in the source code.
 * Extracts identifiers from:
 * - Inline code: `functionName()`
 * - Code blocks: function calls, class instantiations
 * - Links: [text](url) containing code references
 * 
 * Then validates against actual source code to catch renames/deletions.
 */

import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import { execSync } from 'node:child_process';
import yaml from 'js-yaml';
import { fileURLToPath } from 'node:url';
import { dirname } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const configPath = join(__dirname, '..', 'config.yaml');
const exampleConfigPath = join(__dirname, '..', 'config.example.yaml');

export const checkName = 'docs-stale-references';

function loadConfig() {
  if (!existsSync(configPath)) {
    if (existsSync(exampleConfigPath)) {
      console.warn('\n⚠️  config.yaml not found. Copy config.example.yaml to config.yaml and update paths.\n');
    }
    return null;
  }
  return yaml.load(readFileSync(configPath, 'utf-8'));
}

function extractCodeReferences(content) {
  const refs = new Set();
  
  // Match `code` spans
  const inlineCode = content.matchAll(/`([a-zA-Z_][a-zA-Z0-9_]*(?:\(\))?)`/g);
  for (const match of inlineCode) {
    const ref = match[1].replace(/\(\)$/, ''); // Remove trailing ()
    if (ref.length > 2 && /^[A-Z]/.test(ref) || ref.includes('start') || ref.includes('boot')) {
      refs.add(ref);
    }
  }
  
  // Match function calls in text: word()
  const functionCalls = content.matchAll(/\b([a-z][a-zA-Z0-9_]*)\(\)/g);
  for (const match of functionCalls) {
    refs.add(match[1]);
  }
  
  // Match PascalCase (likely classes/types)
  const pascalCase = content.matchAll(/\b([A-Z][a-zA-Z0-9_]{2,})\b/g);
  for (const match of functionCalls) {
    if (!match[1].match(/^(HTTP|API|JSON|XML|URL|MDK|MCP|TCP|REST|MQTT)/)) {
      refs.add(match[1]);
    }
  }
  
  return Array.from(refs);
}

function searchSourceForReference(sourcePath, reference) {
  if (!existsSync(sourcePath)) {
    return null; // Can't validate without source
  }
  
  try {
    // Search for function/class definition
    const patterns = [
      `function ${reference}`,
      `const ${reference} =`,
      `export.*function ${reference}`,
      `class ${reference}`,
      `export.*class ${reference}`,
      `export.*${reference}`
    ];
    
    for (const pattern of patterns) {
      try {
        execSync(`rg -q '${pattern}' '${sourcePath}' 2>/dev/null || grep -rq '${pattern}' '${sourcePath}' 2>/dev/null`, {
          stdio: 'ignore'
        });
        return true; // Found
      } catch {
        // Not found with this pattern, try next
      }
    }
    
    return false; // Not found with any pattern
  } catch {
    return null; // Search error
  }
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

export async function run(targetPath) {
  const config = loadConfig();
  const sourcePath = config?.source_repo?.path;
  
  if (!sourcePath || !existsSync(sourcePath)) {
    return {
      passed: true,
      skipped: true,
      reason: sourcePath ? `Source repo not found: ${sourcePath}` : 'No source_repo configured in config.yaml'
    };
  }
  
  const violations = [];
  const checkedRefs = new Set(); // Avoid checking same ref multiple times
  
  for (const mdFile of walkMarkdownFiles(targetPath)) {
    const content = readFileSync(mdFile, 'utf-8');
    const refs = extractCodeReferences(content);
    
    for (const ref of refs) {
      if (checkedRefs.has(ref)) continue;
      checkedRefs.add(ref);
      
      const found = searchSourceForReference(sourcePath, ref);
      
      if (found === false) {
        violations.push({
          file: mdFile.replace(targetPath, '.'),
          reference: ref,
          issue: 'Referenced function/class not found in source code'
        });
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
  
  console.log(`🔍 Checking for stale code references in: ${targetPath}\n`);
  
  const result = await run(targetPath);
  
  if (result.skipped) {
    console.log(`⚠️  Skipped: ${result.reason}`);
    process.exit(0);
  }
  
  if (result.passed) {
    console.log('✅ All code references found in source');
    process.exit(0);
  } else {
    console.error('❌ Stale references found:\n');
    
    for (const v of result.violations) {
      console.error(`  ${v.file}:`);
      console.error(`    Missing: ${v.reference}`);
      console.error(`    ${v.issue}\n`);
    }
    
    process.exit(1);
  }
}
