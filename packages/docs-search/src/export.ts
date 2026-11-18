/**
 * The page export a docs site publishes for the QVAC docs search index builder.
 *
 * A site adds one static route:
 *
 *   // src/app/docs-search.json/route.ts
 *   import { source } from '@/lib/source';
 *   import { createSearchExport } from '@tetherto/docs-search/export';
 *   export const dynamic = 'force-static'; // must be literal here: Next reads it statically
 *   export const revalidate = false;
 *   export const { GET } = createSearchExport(source, { repo: 'owner/repo', trailingSlash: true });
 *
 * and its normal production build writes `docs-search.json`: for every page,
 * what Fumadocs itself knows. The URLs are the loader's own, so route groups,
 * `baseUrl` and includes are right by construction, and the markdown is the
 * processed text (`postprocess.includeProcessedMarkdown`).
 *
 * Server code, no directive. It imports neither React nor Fumadocs: the source
 * is described structurally, so it works across Fumadocs versions.
 */
import { EXPORT_KIND, EXPORT_VERSION, REPO_PATTERN, type ExportPage, type ExportStructuredData, type ExportTocItem, type ExportV1 } from './contract.js';
import { VERSION } from './version.js';

export type { ExportV1, ExportPage } from './contract.js';

interface TocLike {
  title?: unknown;
  url?: unknown;
  depth?: unknown;
}

interface StructuredDataLike {
  headings?: unknown;
  contents?: unknown;
}

/** The part of a Fumadocs page this reads. `page.data` carries more. */
export interface SearchExportPage {
  url: string;
  data: {
    title?: string;
    description?: string;
    noindex?: boolean;
    noIndex?: boolean;
    toc?: TocLike[];
    structuredData?: StructuredDataLike | (() => StructuredDataLike | Promise<StructuredDataLike>);
    getText?: (type: 'raw' | 'processed') => Promise<string>;
    /** Async-mode collections keep `toc` and `structuredData` here. */
    load?: () => Promise<{ toc?: TocLike[]; structuredData?: StructuredDataLike | (() => StructuredDataLike | Promise<StructuredDataLike>) }>;
  };
}

/** A Fumadocs `source` (the result of `loader()`). */
export interface SearchExportSource {
  getPages(): SearchExportPage[];
}

export interface SearchExportOptions {
  /** `owner/repo` of this docs site. The index builder checks it against the site it is told to read. */
  repo: string;
  /** The site's `trailingSlash` setting: whether the paths it serves end in `/`. */
  trailingSlash: boolean;
  /** Replaces the default filter, which skips pages marked `noindex`. */
  include?: (page: SearchExportPage) => boolean;
  /** The commit this build is of, if the build knows it. */
  commit?: string;
  /**
   * What to do about two pages with one URL: warn and keep the first (the
   * default), throw, or say nothing. Not fatal by default, so that search
   * tooling cannot break a docs deploy; the index builder refuses duplicates.
   */
  onDuplicate?: 'warn' | 'throw' | 'ignore';
}

/** Plain text of a React node, without importing React: strings, numbers, arrays and `props.children`. */
export function flattenText(node: unknown): string {
  if (node === null || node === undefined || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(flattenText).join('');
  if (typeof node === 'object' && 'props' in node) return flattenText((node as { props?: { children?: unknown } }).props?.children);
  return '';
}

function toToc(raw: TocLike[] | undefined): ExportTocItem[] {
  return (raw ?? []).map((t) => ({
    title: flattenText(t.title),
    url: typeof t.url === 'string' ? t.url : '',
    depth: Number.isInteger(t.depth) ? (t.depth as number) : 0,
  }));
}

function toStructuredData(raw: StructuredDataLike | undefined): ExportStructuredData | null {
  if (!raw || !Array.isArray(raw.headings) || !Array.isArray(raw.contents)) return null;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  return {
    headings: raw.headings.map((h: { id?: unknown; content?: unknown }) => ({ id: str(h?.id), content: str(h?.content) })),
    contents: raw.contents.map((c: { heading?: unknown; content?: unknown }) =>
      typeof c?.heading === 'string' ? { heading: c.heading, content: str(c?.content) } : { content: str(c?.content) },
    ),
  };
}

async function buildPage(page: SearchExportPage, trailingSlash: boolean): Promise<ExportPage> {
  const { data } = page;
  if (typeof data.getText !== 'function') {
    throw new Error(
      `@tetherto/docs-search: ${page.url} has no getText('processed'). ` +
        `Set postprocess: { includeProcessedMarkdown: true } for the collection in source.config.ts.`,
    );
  }
  // 16.5 and earlier keep these on the page or behind load(); later versions may
  // make structuredData a function. Read them the way createFromSource does.
  let toc = data.toc;
  let structured = data.structuredData;
  if ((toc === undefined || structured === undefined) && typeof data.load === 'function') {
    const loaded = await data.load();
    toc ??= loaded.toc;
    structured ??= loaded.structuredData;
  }
  if (typeof structured === 'function') structured = await structured();

  const url = trailingSlash && !page.url.endsWith('/') ? `${page.url}/` : page.url;
  return {
    url,
    title: data.title ?? '',
    description: data.description ?? '',
    markdown: await data.getText('processed'),
    toc: toToc(toc),
    structuredData: toStructuredData(structured),
  };
}

/** The export for `source`: what `createSearchExport`'s route serves. */
export async function buildSearchExport(source: SearchExportSource, options: SearchExportOptions): Promise<ExportV1> {
  if (!REPO_PATTERN.test(options.repo)) {
    throw new Error(`@tetherto/docs-search: repo ${JSON.stringify(options.repo)} is not an owner/repo`);
  }
  const include = options.include ?? ((p: SearchExportPage) => !(p.data.noindex || p.data.noIndex));
  const onDuplicate = options.onDuplicate ?? 'warn';

  const built = await Promise.all(
    source
      .getPages()
      .filter(include)
      .map((p) => buildPage(p, options.trailingSlash)),
  );

  const byUrl = new Map<string, ExportPage>();
  for (const page of built) {
    if (byUrl.has(page.url)) {
      const message = `@tetherto/docs-search: two pages have the URL ${page.url}`;
      if (onDuplicate === 'throw') throw new Error(message);
      if (onDuplicate === 'warn') console.warn(`${message}; keeping the first`);
      continue;
    }
    byUrl.set(page.url, page);
  }

  return {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    repo: options.repo,
    generator: `@tetherto/docs-search@${VERSION}`,
    trailingSlash: options.trailingSlash,
    ...(options.commit && { commit: options.commit }),
    pages: [...byUrl.values()].sort((a, b) => (a.url < b.url ? -1 : a.url > b.url ? 1 : 0)),
  };
}

/** A route handler serving the export as JSON. */
export function createSearchExport(source: SearchExportSource, options: SearchExportOptions): { GET: () => Promise<Response> } {
  // Checked when the route module loads, so a wrong repo fails the build at once.
  if (!REPO_PATTERN.test(options.repo)) {
    throw new Error(`@tetherto/docs-search: repo ${JSON.stringify(options.repo)} is not an owner/repo`);
  }
  return {
    async GET() {
      const body = JSON.stringify(await buildSearchExport(source, options));
      return new Response(body, { headers: { 'Content-Type': 'application/json; charset=utf-8' } });
    },
  };
}
