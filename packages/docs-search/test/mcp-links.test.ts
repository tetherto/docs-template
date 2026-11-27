import { test } from 'node:test';
import assert from 'node:assert/strict';
import { assertInstallable, base64Utf8, claudeCodeCommand, configJson, cursorHref, serverConfig, vscodeHref } from '../src/mcp-links.js';

const URL_ = 'https://docs-search.example.com/mcp';

test('serverName must be a bare identifier, and url an http(s) URL', () => {
  for (const ok of ['pear-docs', 'wdk_docs', 'A1', 'x'.repeat(64)]) assert.doesNotThrow(() => assertInstallable(ok, URL_), ok);
  for (const bad of ['', '-x', 'a b', 'a;b', 'a/b', "a'b", 'é', 'x'.repeat(65)]) {
    assert.throws(() => assertInstallable(bad, URL_), /serverName/, JSON.stringify(bad));
  }
  for (const bad of ['', 'docs-search.example.com/mcp', 'javascript:alert(1)', 'ftp://x.example/mcp', 'file:///etc/passwd']) {
    assert.throws(() => assertInstallable('pear-docs', bad), /not an http\(s\) URL/, bad);
  }
  assert.doesNotThrow(() => assertInstallable('pear-docs', 'http://localhost:8787/mcp'));
});

test('Claude Code gets one command with the name and URL', () => {
  assert.equal(claudeCodeCommand('pear-docs', URL_), 'claude mcp add --transport http pear-docs https://docs-search.example.com/mcp');
});

test('a URL a shell would act on is quoted', () => {
  assert.equal(claudeCodeCommand('x', 'https://s.example/mcp?a=1&b=2'), "claude mcp add --transport http x 'https://s.example/mcp?a=1&b=2'");
  assert.equal(claudeCodeCommand('x', "https://s.example/it's"), `claude mcp add --transport http x 'https://s.example/it'\\''s'`);
  assert.equal(claudeCodeCommand('x', 'https://s.example/a;rm -rf'), "claude mcp add --transport http x 'https://s.example/a;rm -rf'");
});

test('the JSON config is an mcpServers map under the server name', () => {
  assert.deepEqual(JSON.parse(configJson('wdk-docs', URL_)), { mcpServers: { 'wdk-docs': { type: 'http', url: URL_ } } });
  assert.deepEqual(serverConfig(URL_), { type: 'http', url: URL_ });
});

test("Cursor's deeplink carries the name and the base64 of the inner config", () => {
  const href = cursorHref('pear-docs', URL_);
  const u = new URL(href);
  assert.equal(u.protocol, 'cursor:');
  assert.equal(u.host, 'anysphere.cursor-deeplink');
  assert.equal(u.pathname, '/mcp/install');
  assert.equal(u.searchParams.get('name'), 'pear-docs');
  assert.deepEqual(JSON.parse(Buffer.from(u.searchParams.get('config') ?? '', 'base64').toString('utf8')), { url: URL_ });
});

test("VS Code's link is the URL-encoded config with the name folded in", () => {
  const href = vscodeHref('pear-docs', URL_);
  assert.ok(href.startsWith('vscode:mcp/install?'));
  assert.deepEqual(JSON.parse(decodeURIComponent(href.slice('vscode:mcp/install?'.length))), { name: 'pear-docs', type: 'http', url: URL_ });
});

test('base64Utf8 encodes bytes, not Latin-1 code units', () => {
  assert.equal(base64Utf8('abc'), Buffer.from('abc').toString('base64'));
  assert.equal(base64Utf8('é—日本'), Buffer.from('é—日本', 'utf8').toString('base64'));
});
