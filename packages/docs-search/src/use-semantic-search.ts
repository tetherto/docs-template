'use client';
import { useEffect, useMemo, useState } from 'react';
import { createDocsSearchClient, hitsToItems, type DocsSearchClient, type SearchItem } from './client.js';
import { createSearchMachine, type SearchStatus } from './machine.js';

export interface UseSemanticSearchOptions {
  /** The service's origin. Not needed with `client`. */
  apiUrl?: string;
  /** Replaces the client built from `apiUrl`, `topK` and `timeoutMs`. Keep its identity stable. */
  client?: DocsSearchClient;
  topK?: number;
  timeoutMs?: number;
  /** Pause after the last keystroke before searching. */
  debounceMs?: number;
  /** Characters needed before anything is searched. */
  minChars?: number;
  mapUrl?: (url: string) => string;
}

export interface SemanticSearch {
  search: string;
  setSearch: (v: string) => void;
  status: SearchStatus;
  items: SearchItem[] | null;
  /** True while a request for the current text is pending. */
  isLoading: boolean;
}

export const DEFAULT_DEBOUNCE_MS = 400;
export const DEFAULT_MIN_CHARS = 3;

/**
 * Semantic search as a hook. `status === 'fallback'` means the service failed or
 * asked to be left alone, and the caller should search some other way.
 */
export function useSemanticSearch(options: UseSemanticSearchOptions): SemanticSearch {
  const { apiUrl, topK, timeoutMs, mapUrl, debounceMs = DEFAULT_DEBOUNCE_MS, minChars = DEFAULT_MIN_CHARS } = options;
  const given = options.client;

  const client = useMemo(() => {
    if (given) return given;
    if (!apiUrl) throw new Error('useSemanticSearch needs an apiUrl or a client');
    return createDocsSearchClient({ apiUrl, topK, timeoutMs });
  }, [given, apiUrl, topK, timeoutMs]);

  const machine = useMemo(
    () => createSearchMachine({ search: (q, signal) => client.search(q, { signal }), debounceMs, minChars }),
    [client, debounceMs, minChars],
  );

  const [search, setSearch] = useState('');
  const [state, setState] = useState(machine.getState());

  useEffect(() => {
    setState(machine.getState());
    const off = machine.subscribe(setState);
    return () => {
      off();
      machine.cancel();
    };
  }, [machine]);
  useEffect(() => {
    machine.setQuery(search);
  }, [machine, search]);

  const items = useMemo(() => (state.hits ? hitsToItems(state.hits, { mapUrl }) : null), [state.hits, mapUrl]);
  return { search, setSearch, status: state.status, items, isLoading: state.status === 'loading' };
}
