'use client';
import { lazy, Suspense, useCallback, useEffect, useMemo, useState, type ComponentType, type ReactNode } from 'react';
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SearchItemType,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search';
import type { FallbackSearchOptions } from './fallback-search.js';
import { Sparkles } from './icons.js';
import { useSemanticSearch } from './use-semantic-search.js';

// Loaded only once the QVAC service has failed once: see fallback-search.tsx.
const FallbackSearch = lazy(() => import('./fallback-search.js'));

/** Opens the site's AI chat with a question. See `inkeepAskAI` in `@tetherto/docs-search/inkeep`. */
export interface AskAIAdapter {
  Component: ComponentType<{ open: boolean; onOpenChange: (open: boolean) => void; question: string }>;
}

export interface DocsSearchLabels {
  /** The header button. */
  askAI?: string;
  /** The row at the end of the results. */
  askAbout?: (query: string) => ReactNode;
}

export interface DocsSearchDialogProps extends SharedProps {
  /** The QVAC docs search service's origin. Required: there is no default service. */
  apiUrl: string;
  topK?: number;
  /** Pause after the last keystroke before searching. */
  debounceMs?: number;
  /** Characters needed before anything is searched. */
  minChars?: number;
  /** Give up on the service after this long and use the fallback. */
  timeoutMs?: number;
  /** Rewrites a result's site path, e.g. to add a base path. */
  mapUrl?: (url: string) => string;
  /**
   * The site's own search (`useDocsSearch` options), used when the service fails
   * or asks to be left alone. Define it at module level: it is compared by value
   * on every render. `false`, or omitted, shows no results instead.
   */
  fallback?: FallbackSearchOptions | false;
  /** Adds an Ask AI button and a row under the results. */
  askAI?: AskAIAdapter;
  labels?: DocsSearchLabels;
  /** Shown when the box is empty, as Fumadocs' default dialog does. */
  links?: [name: string, href: string][];
  footer?: ReactNode;
}

const DEFAULT_ASK_ABOUT = (q: string): ReactNode => (
  <>
    Ask AI about “<span className="font-medium">{q}</span>”
  </>
);

/**
 * Fumadocs' search dialog over the QVAC docs search service: one request per
 * settled query, the site's own search when the service cannot answer.
 *
 * Pass it as the `SearchDialog` of Fumadocs' `RootProvider`, with the props in
 * `options`. It is also the default export, so `next/dynamic` can load it.
 */
export function DocsSearchDialog(props: DocsSearchDialogProps) {
  const { onOpenChange, apiUrl, topK, debounceMs, minChars, timeoutMs, mapUrl, fallback, askAI, labels, links, footer } = props;
  const { search, setSearch, status, items: semantic, isLoading } = useSemanticSearch({
    apiUrl,
    topK,
    timeoutMs,
    debounceMs,
    minChars,
    mapUrl,
  });

  // The fallback is mounted from the first failure on and kept, so its index
  // is not fetched again for every query that follows a recovery.
  const [fallbackNeeded, setFallbackNeeded] = useState(false);
  useEffect(() => {
    if (fallback && status === 'fallback') setFallbackNeeded(true);
  }, [fallback, status]);
  const [fallbackResult, setFallbackResult] = useState<{ items: SearchItemType[] | null; loading: boolean }>({
    items: null,
    loading: false,
  });
  const onFallbackResult = useCallback(
    (items: SearchItemType[] | null, loading: boolean) =>
      setFallbackResult((prev) => (prev.items === items && prev.loading === loading ? prev : { items, loading })),
    [],
  );

  const [askOpen, setAskOpen] = useState(false);
  const [question, setQuestion] = useState('');

  const linkItems = useMemo<SearchItemType[] | null>(
    () => (links?.length ? links.map(([name, href]) => ({ id: `link:${name}`, type: 'page', content: name, url: href })) : null),
    [links],
  );

  const inFallback = status === 'fallback';
  let results: SearchItemType[] | null;
  if (!search.trim()) results = linkItems;
  else if (status === 'idle') results = null; // under minChars: nothing searched, so nothing to show
  else if (inFallback) results = fallback ? fallbackResult.items : null;
  else results = semantic as SearchItemType[] | null;

  function ask(q: string) {
    setQuestion(q);
    setAskOpen(true);
    onOpenChange(false);
  }

  const items: SearchItemType[] | null =
    askAI && search.trim() && results
      ? [
          ...results,
          {
            id: 'ask-ai',
            type: 'action',
            node: (
              <div className="flex items-center gap-2">
                <Sparkles className="size-4 text-fd-primary" />
                <span>{(labels?.askAbout ?? DEFAULT_ASK_ABOUT)(search)}</span>
              </div>
            ),
            onSelect: () => ask(search),
          },
        ]
      : results;

  return (
    <>
      <SearchDialog search={search} onSearchChange={setSearch} isLoading={isLoading || (inFallback && fallbackResult.loading)} open={props.open} onOpenChange={onOpenChange}>
        <SearchDialogOverlay />
        <SearchDialogContent>
          <SearchDialogHeader>
            <SearchDialogIcon />
            <SearchDialogInput />
            {askAI && (
              <button
                type="button"
                onClick={() => ask(search)}
                className="inline-flex shrink-0 items-center gap-1.5 rounded-md border px-2 py-1 text-xs font-medium text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
              >
                <Sparkles className="size-3.5" />
                {labels?.askAI ?? 'Ask AI'}
              </button>
            )}
            <SearchDialogClose />
          </SearchDialogHeader>
          <SearchDialogList items={items} />
          {footer}
        </SearchDialogContent>
      </SearchDialog>
      {askAI && <askAI.Component open={askOpen} onOpenChange={setAskOpen} question={question} />}
      {fallback && fallbackNeeded && (
        <Suspense fallback={null}>
          <FallbackSearch options={fallback} search={search} active={inFallback} onResult={onFallbackResult} />
        </Suspense>
      )}
    </>
  );
}

/** What `createDocsSearchDialog` takes: every prop of the dialog but the ones Fumadocs passes. */
export type DocsSearchDialogConfig = Omit<DocsSearchDialogProps, keyof SharedProps>;

/**
 * The dialog with its configuration fixed, as the `ComponentType<SharedProps>`
 * that `RootProvider`'s `search.SearchDialog` takes (it types `search.options`
 * for its own default dialog, so extra props cannot go there). Call it once, at
 * module level of a client module:
 *
 *   const SearchDialog = createDocsSearchDialog({ apiUrl: process.env.NEXT_PUBLIC_QVAC_API_URL! });
 *   <RootProvider search={{ SearchDialog }}>
 */
export function createDocsSearchDialog(config: DocsSearchDialogConfig): ComponentType<SharedProps> {
  function ConfiguredDocsSearchDialog(shared: SharedProps) {
    return <DocsSearchDialog {...config} {...shared} />;
  }
  return ConfiguredDocsSearchDialog;
}

export default DocsSearchDialog;
