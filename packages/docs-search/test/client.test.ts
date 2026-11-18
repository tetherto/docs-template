import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createDocsSearchClient, DocsSearchError, hitsToItems } from '../src/client.js';

const HIT = { url: '/p2p/x/#a', title: 'X', heading: 'A', score: 0.9, snippet: 'text' };
const ok = (hits = [HIT]) => new Response(JSON.stringify({ model: 'm', hits }), { status: 200 });

interface Call {
  url: string;
  init: RequestInit;
}
function fakeFetch(answer: (call: Call) => Response | Promise<Response>) {
  const calls: Call[] = [];
  const fn = (async (url: string, init: RequestInit) => {
    const call = { url, init };
    calls.push(call);
    return answer(call);
  }) as unknown as typeof fetch;
  return { fn, calls };
}
/** A fetch that never answers, and rejects when aborted, as the real one does. */
const hang = (async (_url: string, init: RequestInit) =>
  new Promise((_, reject) => {
    init.signal?.addEventListener('abort', () => reject(new DOMException('The operation was aborted.', 'AbortError')));
  })) as unknown as typeof fetch;

const rejectsWith = async (p: Promise<unknown>, check: (e: DocsSearchError) => void) => {
  await assert.rejects(p, (e) => {
    assert.ok(e instanceof DocsSearchError, String(e));
    check(e);
    return true;
  });
};

test('a search is one simple POST to /api/search, with no credentials', async () => {
  const { fn, calls } = fakeFetch(() => ok());
  const client = createDocsSearchClient({ apiUrl: 'https://svc.example///', fetch: fn });
  const hits = await client.search('how to join');
  assert.deepEqual(hits, [HIT]);
  assert.equal(calls.length, 1);
  assert.equal(calls[0].url, 'https://svc.example/api/search');
  const { init } = calls[0];
  assert.equal(init.method, 'POST');
  // text/plain, so a cross-origin page sends it without a preflight.
  assert.deepEqual(init.headers, { 'Content-Type': 'text/plain;charset=UTF-8' });
  assert.equal(init.credentials, 'omit');
  assert.deepEqual(JSON.parse(init.body as string), { query: 'how to join', topK: 6 });
  await createDocsSearchClient({ apiUrl: 'https://svc.example', topK: 3, fetch: fn }).search('q');
  assert.equal(JSON.parse(calls[1].init.body as string).topK, 3);
});

test('an http error carries its status and how long to back off', async () => {
  const client = (res: () => Response) => createDocsSearchClient({ apiUrl: 'https://s.example', fetch: fakeFetch(res).fn });
  await rejectsWith(client(() => new Response('{}', { status: 500 })).search('q'), (e) => {
    assert.equal(e.kind, 'http');
    assert.equal(e.status, 500);
    assert.equal(e.retryAfterMs, undefined);
  });
  // From the header.
  await rejectsWith(client(() => new Response('{"error":"rate limited","retryAfter":99}', { status: 429, headers: { 'Retry-After': '7' } })).search('q'), (e) => {
    assert.equal(e.status, 429);
    assert.equal(e.retryAfterMs, 7000);
  });
  // From the body, when a browser could not read the header.
  await rejectsWith(client(() => new Response('{"error":"rate limited","retryAfter":12}', { status: 429 })).search('q'), (e) => {
    assert.equal(e.retryAfterMs, 12000);
  });
  // An HTTP date.
  const in30s = new Date(Date.now() + 30_000).toUTCString();
  await rejectsWith(client(() => new Response('', { status: 503, headers: { 'Retry-After': in30s } })).search('q'), (e) => {
    assert.ok((e.retryAfterMs ?? 0) > 20_000 && (e.retryAfterMs ?? 0) <= 30_000, String(e.retryAfterMs));
  });
  // Neither a number nor a date, and a body that is not JSON.
  await rejectsWith(client(() => new Response('<html>', { status: 503, headers: { 'Retry-After': 'soon' } })).search('q'), (e) => {
    assert.equal(e.retryAfterMs, undefined);
  });
});

test('a response that is not the contract is a shape error', async () => {
  const client = (body: string) => createDocsSearchClient({ apiUrl: 'https://s.example', fetch: fakeFetch(() => new Response(body)).fn });
  await rejectsWith(client('not json').search('q'), (e) => assert.equal(e.kind, 'shape'));
  await rejectsWith(client('{"hits":[{"url":"https://evil.example/"}]}').search('q'), (e) => {
    assert.equal(e.kind, 'shape');
    assert.match(e.message, /url is not a site path/);
  });
});

test('a service that cannot be reached is a network error', async () => {
  const fn = (async () => {
    throw new TypeError('fetch failed');
  }) as unknown as typeof fetch;
  await rejectsWith(createDocsSearchClient({ apiUrl: 'https://s.example', fetch: fn }).search('q'), (e) => {
    assert.equal(e.kind, 'network');
    assert.match(e.message, /fetch failed/);
  });
});

test('a service that does not answer in time is a timeout', async () => {
  const started = Date.now();
  await rejectsWith(createDocsSearchClient({ apiUrl: 'https://s.example', timeoutMs: 30, fetch: hang }).search('q'), (e) => {
    assert.equal(e.kind, 'timeout');
    assert.match(e.message, /30ms/);
  });
  assert.ok(Date.now() - started < 2000);
});

test('a body that stalls after the headers is also a timeout', async () => {
  const stalled = (async (_u: string, init: RequestInit) =>
    ({
      ok: true,
      status: 200,
      headers: new Headers(),
      json: () => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError')))),
    }) as unknown as Response) as unknown as typeof fetch;
  await rejectsWith(createDocsSearchClient({ apiUrl: 'https://s.example', timeoutMs: 30, fetch: stalled }).search('q'), (e) => assert.equal(e.kind, 'timeout'));
});

test("the caller's abort passes through as itself, not as a failure", async () => {
  const client = createDocsSearchClient({ apiUrl: 'https://s.example', timeoutMs: 5000, fetch: hang });
  const ac = new AbortController();
  const pending = client.search('q', { signal: ac.signal });
  ac.abort();
  await assert.rejects(pending, (e) => {
    assert.ok(!(e instanceof DocsSearchError));
    assert.equal((e as Error).name, 'AbortError');
    return true;
  });
  // Already aborted: no request goes out.
  const { fn, calls } = fakeFetch(() => ok());
  const done = new AbortController();
  done.abort(new Error('gone'));
  await assert.rejects(createDocsSearchClient({ apiUrl: 'https://s.example', fetch: fn }).search('q', { signal: done.signal }), /gone/);
  assert.equal(calls.length, 0);
});

test('hitsToItems lists a page row, then its heading and snippet', () => {
  const items = hitsToItems([
    HIT,
    { url: '/b/', title: 'B', heading: 'B', score: 0.5, snippet: '' },
    { url: '/c/', title: 'C', heading: '', score: 0.4, snippet: 'only text' },
  ]);
  assert.deepEqual(
    items.map((i) => [i.id, i.type, i.content]),
    [
      ['0:/p2p/x/#a', 'page', 'X'],
      ['0:/p2p/x/#a#h', 'heading', 'A'],
      ['0:/p2p/x/#a#t', 'text', 'text'],
      ['1:/b/', 'page', 'B'],
      ['2:/c/', 'page', 'C'],
      ['2:/c/#t', 'text', 'only text'],
    ],
    'a heading equal to the title, or empty, is not repeated',
  );
  assert.equal(new Set(items.map((i) => i.id)).size, items.length, 'ids are unique');
  assert.ok(items.every((i) => i.url === (i.id.startsWith('0') ? '/p2p/x/#a' : i.url)));
  assert.deepEqual(hitsToItems([HIT], { mapUrl: (u) => `/docs${u}` }).map((i) => i.url), ['/docs/p2p/x/#a', '/docs/p2p/x/#a', '/docs/p2p/x/#a']);
});
