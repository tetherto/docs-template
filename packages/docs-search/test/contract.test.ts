import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ContractError, isSitePath, parseExport, parseSearchResponse, type ExportV1 } from '../src/contract.js';

test('parseSearchResponse reads what the service sends, and ignores what it adds', () => {
  const hit = { url: '/p2p/x/#a', title: 'X', heading: 'A', score: 0.8123, snippet: 'text' };
  const res = parseSearchResponse({ model: 'gte', hits: [{ ...hit, newField: 1 }], extra: true });
  assert.deepEqual(res, { model: 'gte', hits: [hit] });
  assert.deepEqual(parseSearchResponse({ hits: [] }), { model: '', hits: [] });
});

test('parseSearchResponse names the first thing that is wrong', () => {
  const hit = { url: '/a/', title: 't', heading: '', score: 1, snippet: '' };
  const bad = (v: unknown, re: RegExp) => assert.throws(() => parseSearchResponse(v), (e) => e instanceof ContractError && re.test(e.message));
  bad(null, /not an object/);
  bad([], /not an object/);
  bad({}, /no "hits" array/);
  bad({ hits: [1] }, /hits\[0\] is not an object/);
  bad({ hits: [{ ...hit, url: 'https://evil.example/' }] }, /url is not a site path/);
  bad({ hits: [{ ...hit, url: undefined }] }, /url is not a site path/);
  bad({ hits: [{ ...hit, title: 1 }] }, /title is not a string/);
  bad({ hits: [{ ...hit, heading: null }] }, /heading is not a string/);
  bad({ hits: [{ ...hit, score: NaN }] }, /score is not a number/);
  bad({ hits: [hit, { ...hit, snippet: undefined }] }, /hits\[1\]\.snippet/);
});

test('isSitePath accepts paths on the site and nothing that leaves it', () => {
  for (const ok of ['/', '/a/', '/a/b-c_d/', '/a/b.html', '/a/%20b/']) assert.equal(isSitePath(ok), true, ok);
  for (const bad of ['', 'a/', '//host/', '/a/../b', '/a/./b', '/a\\b', '/a b', '/a?x', '/a#x', '/a\n', 'https://x/a/', 7, null]) {
    assert.equal(isSitePath(bad), false, String(bad));
  }
});

const page = (url: string, extra: object = {}) => ({
  url,
  title: 'T',
  description: '',
  markdown: '# T',
  toc: [{ title: 'H', url: '#h', depth: 2 }],
  structuredData: { headings: [{ id: 'h', content: 'H' }], contents: [{ content: 'lead' }, { heading: 'h', content: 'body' }] },
  ...extra,
});
const doc = (over: object = {}) => ({
  kind: 'docs-search-export',
  version: 1,
  repo: 'tetherto/wdk-docs',
  generator: '@tetherto/docs-search@0.1.0',
  trailingSlash: true,
  pages: [page('/a/'), page('/b/', { structuredData: null })],
  ...over,
});

test('parseExport round-trips a valid export', () => {
  const parsed = parseExport(JSON.parse(JSON.stringify(doc({ commit: 'abc123' }))));
  assert.equal(parsed.repo, 'tetherto/wdk-docs');
  assert.equal(parsed.commit, 'abc123');
  assert.deepEqual(parsed.pages.map((p) => p.url), ['/a/', '/b/']);
  assert.equal(parsed.pages[1].structuredData, null);
  assert.deepEqual(parsed.pages[0].structuredData?.contents, [{ content: 'lead' }, { heading: 'h', content: 'body' }]);
  assert.equal('commit' in parseExport(doc()), false);
});

test('parseExport refuses an export it cannot trust', () => {
  const bad = (v: unknown, re: RegExp, limits = {}) =>
    assert.throws(() => parseExport(v, limits), (e) => e instanceof ContractError && re.test(e.message), JSON.stringify(v).slice(0, 80));
  bad(null, /not an object/);
  bad(doc({ kind: 'other' }), /kind is "other"/);
  bad(doc({ version: 2 }), /version is 2/);
  bad(doc({ repo: 'wdk-docs' }), /repo is not an owner\/repo/);
  bad(doc({ generator: 1 }), /generator/);
  bad(doc({ trailingSlash: 'yes' }), /trailingSlash/);
  bad(doc({ commit: 5 }), /commit/);
  bad(doc({ pages: {} }), /pages is not an array/);
  bad(doc({ pages: [page('//evil.example/')] }), /pages\[0\]\.url is not a site path/);
  bad(doc({ pages: [page('/a/../b/')] }), /site path/);
  bad(doc({ pages: [page('/a/'), page('/a/')] }), /\/a\/ is listed twice/);
  bad(doc({ pages: [page('/a/', { title: 3 })] }), /title is not a string/);
  bad(doc({ pages: [page('/a/', { markdown: undefined })] }), /markdown is not a string/);
  bad(doc({ pages: [page('/a/', { toc: [{ title: 'x' }] })] }), /toc\[0\]/);
  bad(doc({ pages: [page('/a/', { structuredData: { headings: [] } })] }), /structuredData/);
  bad(doc({ pages: [page('/a/', { structuredData: { headings: [{ id: 1, content: '' }], contents: [] } })] }), /headings\[0\]/);
  bad(doc({ pages: [page('/a/', { structuredData: { headings: [], contents: [{ heading: 5, content: '' }] } })] }), /contents\[0\]/);
  bad(doc(), /over the limit of 1/, { maxPages: 1 });
});

test('the types line up: an ExportV1 literal is what parseExport returns', () => {
  const v: ExportV1 = parseExport(doc());
  assert.equal(v.version, 1);
});
