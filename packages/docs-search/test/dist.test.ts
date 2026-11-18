import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { access, readFile } from 'node:fs/promises';
import path from 'node:path';

// What a site installs is dist/, built by `npm run build` (npm test builds first).
const root = new URL('..', import.meta.url).pathname;
const pkg = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf-8'));
const read = (f: string) => readFile(path.join(root, 'dist', f), 'utf-8');
const exists = (p: string) => access(path.join(root, p)).then(() => true, () => false);

test("the client components keep 'use client', and the server and shared code do not have it", async () => {
  for (const f of ['index', 'dialog', 'inkeep', 'inkeep-chat', 'mcp-install', 'use-semantic-search', 'fallback-search']) {
    assert.match(await read(`${f}.js`), /^(['"])use client\1;/, `${f}.js lost its directive`);
  }
  for (const f of ['client', 'export', 'contract', 'machine', 'mcp-links', 'version']) {
    assert.doesNotMatch(await read(`${f}.js`), /use client/, `${f}.js must not be a client module`);
  }
});

test('every exports subpath points at files that exist', async () => {
  for (const [subpath, target] of Object.entries<string | { types: string; default: string }>(pkg.exports)) {
    const files = typeof target === 'string' ? [target] : [target.types, target.default];
    for (const f of files) assert.ok(await exists(f), `${subpath}: ${f} is missing`);
  }
});

test('the server and client-free entry points import nothing but each other', async () => {
  // A site\'s route handler loads /export in Node at build time: no React, no Fumadocs.
  for (const f of ['export', 'contract', 'client', 'machine', 'mcp-links', 'version']) {
    const specifiers = [...(await read(`${f}.js`)).matchAll(/^import .* from ['"]([^'"]+)['"]/gm)].map((m) => m[1]);
    for (const s of specifiers) assert.match(s, /^\.\/[\w-]+\.js$/, `${f}.js imports ${s}`);
  }
  const exp = await import(path.join(root, 'dist/export.js'));
  assert.equal(typeof exp.createSearchExport, 'function');
});

test('relative imports in dist carry their extension, as Node and bundlers need', async () => {
  for (const f of ['index', 'dialog', 'export', 'inkeep', 'mcp-install', 'use-semantic-search']) {
    for (const m of (await read(`${f}.js`)).matchAll(/from ['"](\.[^'"]+)['"]|import\(['"](\.[^'"]+)['"]\)/g)) {
      assert.match(m[1] ?? m[2], /\.js$/, `${f}.js: ${m[0]}`);
    }
  }
});

test('the tarball holds dist, the stylesheet and the docs, and nothing else', () => {
  const out = execFileSync('npm', ['pack', '--dry-run', '--json', '--ignore-scripts'], { cwd: root, encoding: 'utf-8' });
  const files: string[] = JSON.parse(out)[0].files.map((f: { path: string }) => f.path);
  assert.ok(files.includes('package.json'));
  assert.ok(files.includes('tailwind.css'));
  assert.ok(files.includes('dist/index.js'));
  assert.ok(files.includes('dist/index.d.ts'));
  for (const f of files) {
    assert.match(f, /^(dist\/|package\.json$|tailwind\.css$|README\.md$|CHANGELOG\.md$)/, `${f} should not ship`);
  }
  assert.ok(!files.some((f) => f.endsWith('.map') || f.startsWith('src/') || f.startsWith('test/')));
});

test('the stylesheet makes Tailwind scan the package\'s classes', async () => {
  assert.match(await readFile(path.join(root, 'tailwind.css'), 'utf-8'), /^@source "\.\/dist";$/m);
});
