import { test, mock, afterEach } from 'node:test';
import assert from 'node:assert/strict';
import { DocsSearchError } from '../src/client.js';
import type { SearchHit } from '../src/contract.js';
import { createSearchMachine, MAX_COOLDOWN_MS, type MachineState } from '../src/machine.js';

const hit = (n: number): SearchHit => ({ url: `/p/${n}/`, title: `P${n}`, heading: '', score: 1, snippet: '' });
const flush = () => new Promise((r) => setImmediate(r));

afterEach(() => mock.timers.reset());

/** A machine over a fake search that records its calls and lets each be settled by hand. */
function setup(over: { minChars?: number; debounceMs?: number } = {}) {
  mock.timers.enable({ apis: ['setTimeout'] });
  let clock = 1_000_000;
  const calls: { query: string; signal: AbortSignal; ok: (h: SearchHit[]) => void; fail: (e: unknown) => void }[] = [];
  const machine = createSearchMachine({
    debounceMs: over.debounceMs ?? 400,
    minChars: over.minChars ?? 3,
    now: () => clock,
    search: (query, signal) => new Promise((ok, fail) => calls.push({ query, signal, ok, fail })),
  });
  const seen: MachineState[] = [];
  machine.subscribe((s) => seen.push(s));
  return {
    machine,
    calls,
    seen,
    wait: async (ms: number) => {
      mock.timers.tick(ms);
      clock += ms;
      await flush();
    },
    advanceClock: (ms: number) => void (clock += ms),
  };
}

test('under minChars nothing is searched and nothing shows', async () => {
  const { machine, calls, wait } = setup();
  machine.setQuery('ab');
  await wait(1000);
  assert.equal(calls.length, 0);
  assert.deepEqual(machine.getState(), { query: 'ab', status: 'idle', hits: null });
  machine.setQuery('  a  ');
  assert.equal(machine.getState().status, 'idle', 'spaces do not count');
});

test('one request goes out per settled query, not per keystroke', async () => {
  const { machine, calls, wait } = setup();
  for (const q of ['how', 'how t', 'how to', 'how to j']) {
    machine.setQuery(q);
    await wait(100);
  }
  assert.equal(calls.length, 0, 'still typing');
  await wait(300);
  assert.deepEqual(calls.map((c) => c.query), ['how to j']);
  assert.equal(machine.getState().status, 'loading');
});

test('the answer is ready, and the previous results stay up while the next query loads', async () => {
  const { machine, calls, wait } = setup();
  machine.setQuery('first');
  await wait(400);
  calls[0].ok([hit(1)]);
  await flush();
  assert.deepEqual(machine.getState(), { query: 'first', status: 'ready', hits: [hit(1)] });

  machine.setQuery('second');
  assert.deepEqual(machine.getState(), { query: 'second', status: 'loading', hits: [hit(1)] }, 'old results under the spinner');
  await wait(400);
  calls[1].ok([hit(2)]);
  await flush();
  assert.deepEqual(machine.getState(), { query: 'second', status: 'ready', hits: [hit(2)] });

  machine.setQuery('ab');
  assert.deepEqual(machine.getState(), { query: 'ab', status: 'idle', hits: null }, 'clearing the box clears the results');
});

test('a query is sent trimmed', async () => {
  const { machine, calls, wait } = setup();
  machine.setQuery('  spaced out  ');
  await wait(400);
  assert.equal(calls[0].query, 'spaced out');
});

test('a failure is a fallback, with no hits', async () => {
  for (const error of [new DocsSearchError('timeout', 't'), new DocsSearchError('network', 'n'), new DocsSearchError('http', 'h', { status: 500 }), new Error('boom')]) {
    const { machine, calls, wait } = setup();
    machine.setQuery('query');
    await wait(400);
    calls[0].fail(error);
    await flush();
    assert.deepEqual(machine.getState(), { query: 'query', status: 'fallback', hits: null });
    mock.timers.reset();
  }
});

test('an answer for a query that was replaced is dropped', async () => {
  const { machine, calls, wait } = setup();
  machine.setQuery('old query');
  await wait(400);
  machine.setQuery('new query');
  assert.equal(calls[0].signal.aborted, true, 'the old request is aborted');
  await wait(400);
  calls[1].ok([hit(2)]);
  calls[0].ok([hit(1)]); // arrives late
  await flush();
  assert.deepEqual(machine.getState(), { query: 'new query', status: 'ready', hits: [hit(2)] });
  // And a late failure of the old one does not turn the new answer into a fallback.
  calls[0].fail(new DocsSearchError('timeout', 'late'));
  await flush();
  assert.equal(machine.getState().status, 'ready');
});

test('a 429 or 503 that says when to come back sends later queries straight to the fallback', async () => {
  const { machine, calls, wait, advanceClock } = setup();
  machine.setQuery('first');
  await wait(400);
  calls[0].fail(new DocsSearchError('http', 'busy', { status: 429, retryAfterMs: 10_000 }));
  await flush();
  assert.equal(machine.getState().status, 'fallback');

  machine.setQuery('second');
  assert.deepEqual(machine.getState(), { query: 'second', status: 'fallback', hits: null }, 'no spinner, no request');
  await wait(1000);
  assert.equal(calls.length, 1, 'the service is left alone');

  advanceClock(10_000);
  machine.setQuery('third');
  assert.equal(machine.getState().status, 'loading');
  await wait(400);
  assert.equal(calls.length, 2, 'asked again once the time has passed');
  calls[1].ok([hit(3)]);
  await flush();
  assert.equal(machine.getState().status, 'ready', 'and a success flips back');

  machine.setQuery('fourth');
  assert.equal(machine.getState().status, 'loading', 'the cooldown is gone');
});

test('a 503 with Retry-After counts, and a failure that gives no time does not', async () => {
  const a = setup();
  a.machine.setQuery('query');
  await a.wait(400);
  a.calls[0].fail(new DocsSearchError('http', 'busy', { status: 503, retryAfterMs: 2000 }));
  await flush();
  a.machine.setQuery('queryy');
  assert.equal(a.machine.getState().status, 'fallback');
  mock.timers.reset();

  for (const error of [
    new DocsSearchError('http', 'busy', { status: 503 }),
    new DocsSearchError('http', 'error', { status: 500, retryAfterMs: 5000 }),
    new DocsSearchError('timeout', 'slow', { retryAfterMs: 5000 }),
  ]) {
    const b = setup();
    b.machine.setQuery('query');
    await b.wait(400);
    b.calls[0].fail(error);
    await flush();
    b.machine.setQuery('queryy');
    assert.equal(b.machine.getState().status, 'loading', `${error.message} does not start a cooldown`);
    mock.timers.reset();
  }
});

test('however long the service asks for, the cooldown is capped', async () => {
  const { machine, calls, wait, advanceClock } = setup();
  machine.setQuery('query');
  await wait(400);
  calls[0].fail(new DocsSearchError('http', 'busy', { status: 429, retryAfterMs: 24 * 3600 * 1000 }));
  await flush();
  advanceClock(MAX_COOLDOWN_MS - 1);
  machine.setQuery('queryy');
  assert.equal(machine.getState().status, 'fallback');
  advanceClock(1);
  machine.setQuery('queryyy');
  assert.equal(machine.getState().status, 'loading');
});

test('cancel stops a pending search and one in flight, and the machine still works', async () => {
  const { machine, calls, wait } = setup();
  machine.setQuery('pending');
  machine.cancel();
  await wait(1000);
  assert.equal(calls.length, 0);

  machine.setQuery('in flight');
  await wait(400);
  machine.cancel();
  assert.equal(calls[0].signal.aborted, true);
  calls[0].ok([hit(1)]);
  await flush();
  assert.equal(machine.getState().status, 'loading', 'its answer is not shown');

  machine.setQuery('again please');
  await wait(400);
  calls[1].ok([hit(2)]);
  await flush();
  assert.equal(machine.getState().status, 'ready');
});

test('listeners hear every change, once, until they unsubscribe', async () => {
  const { machine, calls, seen, wait } = setup();
  const extra: MachineState[] = [];
  const off = machine.subscribe((s) => extra.push(s));
  machine.setQuery('query');
  machine.setQuery('query'); // no change
  await wait(400);
  calls[0].ok([hit(1)]);
  await flush();
  assert.deepEqual(seen.map((s) => s.status), ['loading', 'ready']);
  off();
  machine.setQuery('another');
  assert.equal(seen.length, 3);
  assert.equal(extra.length, 2);
});
