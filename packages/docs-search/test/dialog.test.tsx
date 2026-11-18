import { test, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { registerDom } from './dom.js';

// A DOM for the components. Registered before they (and React) are imported.
registerDom('https://docs.example.com/');
const realFetch = globalThis.fetch;

const { createElement: h, useEffect } = await import('react');
const { render, screen, cleanup, fireEvent, waitFor } = await import('./render.js');
const { FrameworkProvider } = await import('fumadocs-core/framework');
const { DocsSearchDialog, createDocsSearchDialog } = await import('../src/dialog.js');
type Props = Parameters<typeof DocsSearchDialog>[0];

afterEach(() => {
  cleanup();
  globalThis.fetch = realFetch;
});

const HITS = [
  { url: '/p2p/how-to/join/#topics', title: 'Join a swarm', heading: 'Topics', score: 0.9, snippet: 'Call swarm.join(topic).' },
  { url: '/p2p/ref/core/', title: 'Hypercore', heading: '', score: 0.8, snippet: '' },
];
const FALLBACK = { type: 'fetch', api: 'https://docs.example.com/api/own-search' } as const;
const FALLBACK_HITS = [{ id: 'f1', type: 'page', content: 'Own search result', url: '/own/' }];

interface Req {
  url: string;
  query?: string;
}
/** Answers the service and the site's own search from `answer`; records what was asked. */
function stubFetch(answer: (req: Req) => Response | Promise<Response>) {
  const requests: Req[] = [];
  globalThis.fetch = (async (input: string | URL, init?: RequestInit) => {
    const url = String(input);
    const req: Req = { url, ...(init?.body ? { query: JSON.parse(init.body as string).query } : {}) };
    requests.push(req);
    return answer(req);
  }) as typeof fetch;
  return requests;
}
const json = (v: unknown, status = 200, headers: Record<string, string> = {}) => new Response(JSON.stringify(v), { status, headers });
const isService = (r: Req) => r.url.startsWith('https://svc.example/');
const serviceRequests = (rs: Req[]) => rs.filter(isService);

const pushed: string[] = [];
function mount(props: Partial<Props> = {}) {
  const onOpenChange = props.onOpenChange ?? (() => {});
  return render(
    <FrameworkProvider usePathname={() => '/'} useParams={() => ({})} useRouter={() => ({ push: (u: string) => void pushed.push(u), refresh() {} })}>
      <DocsSearchDialog open apiUrl="https://svc.example" debounceMs={10} {...props} onOpenChange={onOpenChange} />
    </FrameworkProvider>,
  );
}
const input = () => document.querySelector('input') as HTMLInputElement;
const type = (text: string) => fireEvent.change(input(), { target: { value: text } });
const settle = (ms = 80) => new Promise((r) => setTimeout(r, ms));

test('typing searches the service once and lists the page, heading and snippet', async () => {
  const requests = stubFetch(() => json({ model: 'm', hits: HITS }));
  mount();
  type('how');
  type('how to');
  type('how to join');
  await waitFor(() => screen.getByText('Join a swarm'));
  assert.deepEqual(requests, [{ url: 'https://svc.example/api/search', query: 'how to join' }]);
  screen.getByText('Topics');
  screen.getByText('Call swarm.join(topic).');
  screen.getByText('Hypercore');
});

test('under three characters nothing is searched and nothing is listed', async () => {
  const requests = stubFetch(() => json({ model: 'm', hits: HITS }));
  mount();
  type('ab');
  await settle();
  assert.deepEqual(requests, []);
  assert.equal(screen.queryByText('Join a swarm'), null);
});

test('minChars and topK are the site\'s to set', async () => {
  const requests = stubFetch(() => json({ model: 'm', hits: [] }));
  mount({ minChars: 1, topK: 2 });
  type('a');
  await waitFor(() => assert.equal(requests.length, 1));
});

test('mapUrl rewrites where a result goes', async () => {
  stubFetch(() => json({ model: 'm', hits: HITS }));
  mount({ mapUrl: (u) => `/docs${u}` });
  type('how to join');
  fireEvent.click(await waitFor(() => screen.getByText('Join a swarm')));
  assert.equal(pushed.at(-1), '/docs/p2p/how-to/join/#topics');
});

test('there is no Ask AI without an adapter', async () => {
  stubFetch(() => json({ model: 'm', hits: HITS }));
  mount();
  type('how to join');
  await waitFor(() => screen.getByText('Join a swarm'));
  assert.equal(screen.queryByText('Ask AI'), null);
  assert.equal(screen.queryByText(/Ask AI about/), null);
});

test('with an adapter, Ask AI hands the typed query over and closes the dialog', async () => {
  stubFetch(() => json({ model: 'm', hits: HITS }));
  const opened: { open: boolean; question: string }[] = [];
  const closed: boolean[] = [];
  const askAI = {
    Component: ({ open, question }: { open: boolean; question: string }) => {
      useEffect(() => void opened.push({ open, question }), [open, question]);
      return open ? h('div', { 'data-testid': 'chat' }, `chat: ${question}`) : null;
    },
  };
  mount({ askAI, onOpenChange: (o) => void closed.push(o) });
  type('how to join');
  await waitFor(() => screen.getByText('Join a swarm'));
  screen.getByText(/Ask AI about/);
  fireEvent.click(screen.getByText('Ask AI'));
  await waitFor(() => screen.getByText('chat: how to join'));
  assert.deepEqual(closed, [false]);
  assert.deepEqual(opened.at(-1), { open: true, question: 'how to join' });
});

test('labels rename the Ask AI button and its row', async () => {
  stubFetch(() => json({ model: 'm', hits: HITS }));
  const askAI = { Component: () => null };
  mount({ askAI, labels: { askAI: 'Ask the bot', askAbout: (q) => `Bot, what is ${q}?` } });
  type('how to join');
  await waitFor(() => screen.getByText('Bot, what is how to join?'));
  screen.getByText('Ask the bot');
});

test('when the service fails, the site\'s own search answers', async () => {
  const requests = stubFetch((r) => (isService(r) ? json({ error: 'x' }, 500) : json(FALLBACK_HITS)));
  mount({ fallback: FALLBACK });
  // Nothing of the fallback is touched while the service is fine.
  assert.deepEqual(requests, []);
  type('how to join');
  await waitFor(() => screen.getByText('Own search result'));
  assert.equal(serviceRequests(requests).length, 1);
});

test('a site\'s own search is not touched while the service answers', async () => {
  const requests = stubFetch((r) => (isService(r) ? json({ model: 'm', hits: HITS }) : json(FALLBACK_HITS)));
  mount({ fallback: FALLBACK });
  type('how to join');
  await waitFor(() => screen.getByText('Join a swarm'));
  await settle(100);
  assert.ok(requests.every(isService), requests.map((r) => r.url).join(', '));
});

test('a service that asks to be left alone is not asked again until it says so', async () => {
  const requests = stubFetch((r) => (isService(r) ? json({ error: 'rate limited', retryAfter: 30 }, 429, { 'Retry-After': '30' }) : json(FALLBACK_HITS)));
  mount({ fallback: FALLBACK });
  type('first query');
  await waitFor(() => screen.getByText('Own search result'));
  assert.equal(serviceRequests(requests).length, 1);
  type('second query');
  await settle(150);
  type('third query');
  await settle(150);
  assert.equal(serviceRequests(requests).length, 1, 'still one: the service was left alone');
  await waitFor(() => assert.ok(requests.some((r) => r.url.includes('third+query') || r.url.includes('third%20query') || r.url.includes('query=third'))));
});

test('a fallback that is not configured shows no results instead of failing', async () => {
  stubFetch(() => json({ error: 'x' }, 500));
  mount();
  type('how to join');
  await settle(150);
  assert.equal(screen.queryByText('Own search result'), null);
  assert.equal(screen.queryByText('Join a swarm'), null);
  mount({ fallback: false });
});

test('an empty box lists the links it was given', async () => {
  stubFetch(() => json({ model: 'm', hits: [] }));
  mount({ links: [['Home', '/'], ['Guides', '/guides/']] });
  screen.getByText('Home');
  screen.getByText('Guides');
  type('how to join');
  await waitFor(() => assert.equal(screen.queryByText('Home'), null));
});

test('createDocsSearchDialog fits where Fumadocs wants a dialog taking only its own props', async () => {
  const requests = stubFetch(() => json({ model: 'm', hits: HITS }));
  const Configured = createDocsSearchDialog({ apiUrl: 'https://svc.example', debounceMs: 10, topK: 3 });
  render(
    <FrameworkProvider usePathname={() => '/'} useParams={() => ({})} useRouter={() => ({ push() {}, refresh() {} })}>
      <Configured open onOpenChange={() => {}} />
    </FrameworkProvider>,
  );
  type('how to join');
  await waitFor(() => screen.getByText('Join a swarm'));
  assert.equal(requests[0].url, 'https://svc.example/api/search');
});
