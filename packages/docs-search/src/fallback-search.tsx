'use client';
import { useEffect } from 'react';
import { useDocsSearch } from 'fumadocs-core/search/client';
import type { SearchItemType } from 'fumadocs-ui/components/dialog/search';

/** The site's own `useDocsSearch` options, e.g. its Orama static index. Define it at module level. */
export type FallbackSearchOptions = Parameters<typeof useDocsSearch>[0];

export interface FallbackSearchProps {
  options: FallbackSearchOptions;
  search: string;
  /** Only an active fallback searches: otherwise its index is kept loaded but idle. */
  active: boolean;
  onResult: (items: SearchItemType[] | null, isLoading: boolean) => void;
}

/**
 * The site's own search, run only after the QVAC service has failed. A component
 * of its own, loaded with React.lazy by the dialog, so that a site whose service
 * works never downloads this code nor the index behind it (a static Orama index
 * is fetched when `useDocsSearch` first runs).
 */
export default function FallbackSearch({ options, search, active, onResult }: FallbackSearchProps) {
  const { setSearch, query } = useDocsSearch(options);

  useEffect(() => {
    setSearch(active ? search : '');
  }, [active, search, setSearch]);

  const items = query.data && query.data !== 'empty' ? (query.data as SearchItemType[]) : null;
  const isLoading = query.isLoading;
  useEffect(() => {
    onResult(active ? items : null, active && isLoading);
  }, [active, items, isLoading, onResult]);

  return null;
}
