/**
 * A client for the QVAC docs search service's `POST /api/search`.
 *
 * No directive: it runs anywhere `fetch` does, and the dialog's state machine
 * (machine.ts) is built on it.
 */
import { ContractError, parseSearchResponse, type SearchHit } from './contract.js';

export type DocsSearchErrorKind = 'http' | 'timeout' | 'network' | 'shape';

/**
 * Why a search failed. `retryAfterMs` is set when the service said how long to
 * leave it alone (a 429, or a 503 because its embed queue is full), from the
 * `Retry-After` header or, failing that, the body's `retryAfter`.
 */
export class DocsSearchError extends Error {
  constructor(
    readonly kind: DocsSearchErrorKind,
    message: string,
    readonly details: { status?: number; retryAfterMs?: number } = {},
  ) {
    super(message);
    this.name = 'DocsSearchError';
  }
  get status(): number | undefined {
    return this.details.status;
  }
  get retryAfterMs(): number | undefined {
    return this.details.retryAfterMs;
  }
}

export interface DocsSearchClientOptions {
  /** The service's origin, e.g. `https://docs-search.example.com`. A trailing slash is ignored. */
  apiUrl: string;
  /** Results to ask for. The service clamps it to 1-20. */
  topK?: number;
  /** Give up on a request after this long. */
  timeoutMs?: number;
  /** Replaces the global `fetch`, for tests. */
  fetch?: typeof fetch;
}

export interface DocsSearchClient {
  search(query: string, opts?: { signal?: AbortSignal }): Promise<SearchHit[]>;
}

/** A Retry-After header: delta-seconds, or an HTTP date. */
function retryAfterMs(header: string | null, now: number): number | undefined {
  if (!header) return undefined;
  const secs = Number(header);
  if (Number.isFinite(secs) && secs >= 0) return Math.round(secs * 1000);
  const at = Date.parse(header);
  return Number.isNaN(at) ? undefined : Math.max(0, at - now);
}

export function createDocsSearchClient(options: DocsSearchClientOptions): DocsSearchClient {
  const endpoint = `${options.apiUrl.trim().replace(/\/+$/, '')}/api/search`;
  const topK = options.topK ?? 6;
  const timeoutMs = options.timeoutMs ?? 4000;

  return {
    async search(query, { signal } = {}) {
      // Our own controller, so the caller's abort and the timeout can be told
      // apart: a caller that moved on is not an error, a timeout is.
      const ac = new AbortController();
      let timedOut = false;
      const onCallerAbort = () => ac.abort(signal?.reason);
      if (signal?.aborted) throw signal.reason ?? new DOMException('aborted', 'AbortError');
      signal?.addEventListener('abort', onCallerAbort, { once: true });
      const timer = setTimeout(() => {
        timedOut = true;
        ac.abort();
      }, timeoutMs);
      try {
        let res: Response;
        try {
          res = await (options.fetch ?? globalThis.fetch)(endpoint, {
            method: 'POST',
            // text/plain keeps this a "simple" cross-origin request: the browser
            // sends it without a preflight, which would otherwise double the
            // round trips of every search. The service reads the body as JSON
            // whatever the type says.
            headers: { 'Content-Type': 'text/plain;charset=UTF-8' },
            body: JSON.stringify({ query, topK }),
            credentials: 'omit',
            signal: ac.signal,
          });
        } catch (e) {
          if (signal?.aborted) throw signal.reason ?? e;
          if (timedOut) throw new DocsSearchError('timeout', `the search took longer than ${timeoutMs}ms`);
          throw new DocsSearchError('network', `the search service could not be reached: ${(e as Error).message}`);
        }
        if (!res.ok) {
          let fromBody: number | undefined;
          try {
            const body = (await res.json()) as { retryAfter?: unknown };
            if (typeof body.retryAfter === 'number' && body.retryAfter >= 0) fromBody = Math.round(body.retryAfter * 1000);
          } catch {
            // Not JSON, or cut off: the header may still say.
          }
          throw new DocsSearchError('http', `the search service answered ${res.status}`, {
            status: res.status,
            retryAfterMs: retryAfterMs(res.headers.get('retry-after'), Date.now()) ?? fromBody,
          });
        }
        try {
          return parseSearchResponse(await res.json()).hits;
        } catch (e) {
          if (signal?.aborted) throw signal.reason ?? e;
          if (timedOut) throw new DocsSearchError('timeout', `the search took longer than ${timeoutMs}ms`);
          const why = e instanceof ContractError ? e.message : 'the response is not JSON';
          throw new DocsSearchError('shape', why, { status: res.status });
        }
      } finally {
        clearTimeout(timer);
        signal?.removeEventListener('abort', onCallerAbort);
      }
    },
  };
}

/** A result row in the shape Fumadocs' search list takes. */
export interface SearchItem {
  id: string;
  url: string;
  type: 'page' | 'heading' | 'text';
  content: string;
}

/**
 * Hits as list rows: a page row per hit, then the section's heading and a
 * snippet of its text. Ids carry the hit's rank so two hits for one page (or one
 * heading) cannot collide, which React would otherwise merge into one row.
 */
export function hitsToItems(hits: SearchHit[], opts: { mapUrl?: (url: string) => string } = {}): SearchItem[] {
  const map = opts.mapUrl ?? ((u: string) => u);
  const items: SearchItem[] = [];
  hits.forEach((h, i) => {
    const url = map(h.url);
    items.push({ id: `${i}:${h.url}`, url, type: 'page', content: h.title });
    if (h.heading && h.heading !== h.title) items.push({ id: `${i}:${h.url}#h`, url, type: 'heading', content: h.heading });
    if (h.snippet) items.push({ id: `${i}:${h.url}#t`, url, type: 'text', content: h.snippet });
  });
  return items;
}
