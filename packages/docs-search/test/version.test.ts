import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { VERSION } from '../src/version.js';

test("version.ts is package.json's version, so an export names the emitter that wrote it", async () => {
  const pkg = JSON.parse(await readFile(new URL('../package.json', import.meta.url), 'utf-8'));
  assert.equal(VERSION, pkg.version);
});
