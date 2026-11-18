import { test, mock } from 'node:test';
import assert from 'node:assert/strict';
import { parseExport } from '../src/contract.js';
import { buildSearchExport, createSearchExport, flattenText, type SearchExportPage } from '../src/export.js';
import { VERSION } from '../src/version.js';

const REPO = 'tetherto/wdk-docs';

const SD = {
  headings: [{ id: 'setup', content: 'Setup' }],
  contents: [{ content: 'Lead text.' }, { heading: 'setup', content: 'Do this.' }],
};

/** A page the way Fumadocs 16.5 gives one: everything on page.data. */
function page(url: string, data: Partial<SearchExportPage['data']> = {}): SearchExportPage {
  return {
    url,
    data: {
      title: `Title ${url}`,
      description: 'A page.',
      toc: [{ title: 'Setup', url: '#setup', depth: 2 }],
      structuredData: SD,
      getText: async (type) => (type === 'processed' ? `# Title ${url}\n\nSetup [#setup]\n` : 'raw'),
      ...data,
    },
  };
}
const source = (pages: SearchExportPage[]) => ({ getPages: () => pages });
const opts = { repo: REPO, trailingSlash: true };

test('every page is exported with what Fumadocs knows of it', async () => {
  const out = await buildSearchExport(source([page('/a/')]), { ...opts, commit: 'abc123' });
  assert.deepEqual(out, {
    kind: 'docs-search-export',
    version: 1,
    repo: REPO,
    generator: `@tetherto/docs-search@${VERSION}`,
    trailingSlash: true,
    commit: 'abc123',
    pages: [
      {
        url: '/a/',
        title: 'Title /a/',
        description: 'A page.',
        markdown: '# Title /a/\n\nSetup [#setup]\n',
        toc: [{ title: 'Setup', url: '#setup', depth: 2 }],
        structuredData: SD,
      },
    ],
  });
  assert.doesNotThrow(() => parseExport(JSON.parse(JSON.stringify(out))), 'and the builder accepts it');
  assert.equal('commit' in (await buildSearchExport(source([page('/a/')]), opts)), false);
});

test('toc and structuredData come from load() when the page does not carry them', async () => {
  const lazy = page('/lazy/', { toc: undefined, structuredData: undefined, load: async () => ({ toc: [{ title: 'L', url: '#l', depth: 3 }], structuredData: SD }) });
  const out = await buildSearchExport(source([lazy]), opts);
  assert.deepEqual(out.pages[0].toc, [{ title: 'L', url: '#l', depth: 3 }]);
  assert.deepEqual(out.pages[0].structuredData, SD);
});

test('structuredData may be a function, as in later Fumadocs versions', async () => {
  const fn = page('/fn/', { structuredData: async () => SD });
  assert.deepEqual((await buildSearchExport(source([fn]), opts)).pages[0].structuredData, SD);
});

test('a page without usable structuredData exports null, for the builder to fall back on', async () => {
  const none = page('/none/', { structuredData: undefined });
  const junk = page('/junk/', { structuredData: { headings: 'x' } });
  const out = await buildSearchExport(source([none, junk]), opts);
  assert.deepEqual(out.pages.map((p) => p.structuredData), [null, null]);
});

test('toc titles that are React nodes become text', async () => {
  const node = (children: unknown) => ({ type: 'span', props: { children } });
  const p = page('/n/', {
    toc: [
      { title: node(['Use ', node('Hypercore'), ' with ', 42]), url: '#a', depth: 2 },
      { title: null, url: '#b', depth: 3 },
      { title: 'plain', url: '#c', depth: 1.5 },
    ],
  });
  assert.deepEqual((await buildSearchExport(source([p]), opts)).pages[0].toc, [
    { title: 'Use Hypercore with 42', url: '#a', depth: 2 },
    { title: '', url: '#b', depth: 3 },
    { title: 'plain', url: '#c', depth: 0 },
  ]);
  assert.equal(flattenText(false), '');
  assert.equal(flattenText({ foo: 1 }), '');
});

test('pages marked noindex are left out, unless include says otherwise', async () => {
  const pages = [page('/yes/'), page('/no/', { noindex: true }), page('/no2/', { noIndex: true })];
  assert.deepEqual((await buildSearchExport(source(pages), opts)).pages.map((p) => p.url), ['/yes/']);
  const all = await buildSearchExport(source(pages), { ...opts, include: () => true });
  assert.deepEqual(all.pages.map((p) => p.url), ['/no/', '/no2/', '/yes/']);
  const some = await buildSearchExport(source(pages), { ...opts, include: (p) => p.url.startsWith('/no') });
  assert.deepEqual(some.pages.map((p) => p.url), ['/no/', '/no2/']);
});

test('trailingSlash decides whether a path ends in a slash, except the root', async () => {
  const pages = [page('/a'), page('/b/'), page('/')];
  assert.deepEqual((await buildSearchExport(source(pages), { ...opts, trailingSlash: true })).pages.map((p) => p.url), ['/', '/a/', '/b/']);
  const off = await buildSearchExport(source(pages), { ...opts, trailingSlash: false });
  assert.equal(off.trailingSlash, false);
  assert.deepEqual(off.pages.map((p) => p.url), ['/', '/a', '/b/'], 'urls are the loader\'s own');
});

test('the export is sorted and byte-stable whatever the order the source gives', async () => {
  const pages = ['/z/', '/a/b/', '/a/', '/m/'].map((u) => page(u));
  const one = JSON.stringify(await buildSearchExport(source(pages), opts));
  const two = JSON.stringify(await buildSearchExport(source([...pages].reverse()), opts));
  assert.equal(one, two);
  assert.deepEqual(JSON.parse(one).pages.map((p: { url: string }) => p.url), ['/a/', '/a/b/', '/m/', '/z/']);
  assert.ok(!/builtAt|generatedAt|timestamp/i.test(one), 'nothing that changes between identical builds');
});

test('two pages with one URL warn and keep the first, throw, or are ignored', async () => {
  const dup = [page('/d/', { title: 'First' }), page('/d/', { title: 'Second' })];
  const warn = mock.method(console, 'warn', () => {});
  try {
    const out = await buildSearchExport(source(dup), opts);
    assert.deepEqual(out.pages.map((p) => p.title), ['First']);
    assert.equal(warn.mock.callCount(), 1);
    assert.match(String(warn.mock.calls[0].arguments[0]), /two pages have the URL \/d\//);
    await buildSearchExport(source(dup), { ...opts, onDuplicate: 'ignore' });
    assert.equal(warn.mock.callCount(), 1, 'ignore says nothing');
  } finally {
    warn.mock.restore();
  }
  await assert.rejects(buildSearchExport(source(dup), { ...opts, onDuplicate: 'throw' }), /two pages have the URL \/d\//);
});

test("a page without processed markdown fails with the setting to turn on", async () => {
  const p = page('/raw/', { getText: undefined });
  await assert.rejects(buildSearchExport(source([p]), opts), /\/raw\/ has no getText\('processed'\).*includeProcessedMarkdown/);
});

test('a repo that is not owner/repo fails when the route is set up, not when it is served', () => {
  for (const repo of ['', 'wdk-docs', 'a/b/c', 'tetherto/wdk docs']) {
    assert.throws(() => createSearchExport(source([]), { ...opts, repo }), /is not an owner\/repo/, repo);
  }
});

test('the route handler serves the export as JSON', async () => {
  const { GET } = createSearchExport(source([page('/a/'), page('/b/')]), opts);
  const res = await GET();
  assert.equal(res.status, 200);
  assert.match(res.headers.get('content-type') ?? '', /^application\/json/);
  const parsed = parseExport(await res.json());
  assert.equal(parsed.repo, REPO);
  assert.deepEqual(parsed.pages.map((p) => p.url), ['/a/', '/b/']);
});
