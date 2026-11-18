/**
 * The search box's logic without React: when to search, what to show, when to
 * fall back. Pure enough to test with fake timers; use-semantic-search.ts binds
 * it to a component.
 *
 * Per query:
 *   - under `minChars` nothing is searched, and nothing shows, loading included;
 *   - otherwise the service is asked once the user has paused for `debounceMs`,
 *     so one request goes out per settled query, not per keystroke;
 *   - while it is out, the previous results stay up and `loading` is on;
 *   - on any failure the state is `fallback`, for the caller to search some
 *     other way;
 *   - and when the service said how long to leave it alone (a 429, or a 503
 *     because its embed queue is full), later queries go straight to `fallback`
 *     without asking until that time has passed. A success clears it.
 */
import { DocsSearchError } from './client.js';
import type { SearchHit } from './contract.js';

export type SearchStatus = 'idle' | 'loading' | 'ready' | 'fallback';

export interface MachineState {
  /** The text in the box, as typed. */
  query: string;
  status: SearchStatus;
  /** The service's answer for the last query that got one; null while there is none to show. */
  hits: SearchHit[] | null;
}

export interface MachineOptions {
  search: (query: string, signal: AbortSignal) => Promise<SearchHit[]>;
  debounceMs: number;
  minChars: number;
  now?: () => number;
}

/** However long the service asks to be left alone, never more than this. */
export const MAX_COOLDOWN_MS = 5 * 60 * 1000;

export interface SearchMachine {
  getState(): MachineState;
  subscribe(listener: (state: MachineState) => void): () => void;
  setQuery(query: string): void;
  /** Stop any pending or running search. The machine stays usable. */
  cancel(): void;
}

export function createSearchMachine(opts: MachineOptions): SearchMachine {
  const now = opts.now ?? Date.now;
  let state: MachineState = { query: '', status: 'idle', hits: null };
  let timer: ReturnType<typeof setTimeout> | undefined;
  let running: AbortController | undefined;
  // Bumped by every query and every cancel: an answer for an older one is dropped.
  let generation = 0;
  let cooldownUntil = 0;
  const listeners = new Set<(s: MachineState) => void>();

  function emit(next: MachineState) {
    if (next.query === state.query && next.status === state.status && next.hits === state.hits) return;
    state = next;
    for (const l of [...listeners]) l(state);
  }

  function cancel() {
    clearTimeout(timer);
    timer = undefined;
    running?.abort();
    running = undefined;
    generation++;
  }

  function setQuery(query: string) {
    cancel();
    const q = query.trim();
    if (q.length < opts.minChars) return emit({ query, status: 'idle', hits: null });
    if (now() < cooldownUntil) return emit({ query, status: 'fallback', hits: null });

    const mine = generation;
    emit({ query, status: 'loading', hits: state.status === 'ready' || state.status === 'loading' ? state.hits : null });
    timer = setTimeout(async () => {
      timer = undefined;
      const ac = new AbortController();
      running = ac;
      try {
        const hits = await opts.search(q, ac.signal);
        if (mine !== generation) return;
        cooldownUntil = 0;
        emit({ query, status: 'ready', hits });
      } catch (e) {
        if (mine !== generation || ac.signal.aborted) return;
        if (e instanceof DocsSearchError && e.kind === 'http' && (e.status === 429 || e.status === 503) && e.retryAfterMs !== undefined) {
          cooldownUntil = now() + Math.min(e.retryAfterMs, MAX_COOLDOWN_MS);
        }
        emit({ query, status: 'fallback', hits: null });
      } finally {
        if (running === ac) running = undefined;
      }
    }, opts.debounceMs);
  }

  return {
    getState: () => state,
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
    setQuery,
    cancel,
  };
}
