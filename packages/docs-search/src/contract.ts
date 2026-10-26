/**
 * The two wire formats this package shares with the QVAC docs search service:
 *
 *   - `POST /api/search` answers with a `SearchResponse` (the service's
 *     `src/app.ts`), which the dialog and client read.
 *   - A site's `/docs-search.json` is an `ExportV1` (see `export.ts`), which the
 *     service's index builder reads.
 *
 * No directive and no imports, so server code, a browser and the builder can all
 * use it.
 */

/** One search result. `url` is a site path (`/p2p/how-to/x/#section`), never absolute. */
export interface SearchHit {
  url: string;
  title: string;
  /** The section's heading; empty for a page's lead section. */
  heading: string;
  score: number;
  snippet: string;
}

export interface SearchResponse {
  model: string;
  hits: SearchHit[];
}

const isObject = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Thrown for a document that is not what its contract says. The message names the first thing wrong. */
export class ContractError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'ContractError';
  }
}

/**
 * `v` as a `SearchResponse`, or a `ContractError`.
 *
 * Checks what the dialog relies on and ignores fields it does not know, so the
 * service can add to the response without breaking an installed site.
 */
export function parseSearchResponse(v: unknown): SearchResponse {
  if (!isObject(v)) throw new ContractError('the search response is not an object');
  if (!Array.isArray(v.hits)) throw new ContractError('the search response has no "hits" array');
  const hits = v.hits.map((h, i): SearchHit => {
    if (!isObject(h)) throw new ContractError(`hits[${i}] is not an object`);
    if (typeof h.url !== 'string' || !h.url.startsWith('/')) throw new ContractError(`hits[${i}].url is not a site path`);
    if (typeof h.title !== 'string') throw new ContractError(`hits[${i}].title is not a string`);
    if (typeof h.heading !== 'string') throw new ContractError(`hits[${i}].heading is not a string`);
    if (typeof h.score !== 'number' || !Number.isFinite(h.score)) throw new ContractError(`hits[${i}].score is not a number`);
    if (typeof h.snippet !== 'string') throw new ContractError(`hits[${i}].snippet is not a string`);
    return { url: h.url, title: h.title, heading: h.heading, score: h.score, snippet: h.snippet };
  });
  return { model: typeof v.model === 'string' ? v.model : '', hits };
}

// --- the page export -------------------------------------------------------

export interface ExportTocItem {
  title: string;
  url: string;
  depth: number;
}

/** Fumadocs' `structuredData`: the page's headings and the prose under each. */
export interface ExportStructuredData {
  headings: { id: string; content: string }[];
  /** `heading` is a heading's id, absent for the lead section. */
  contents: { heading?: string; content: string }[];
}

export interface ExportPage {
  /** The page's path with a trailing slash if the site has them: `/p2p/how-to/x/`. */
  url: string;
  title: string;
  description: string;
  /** Fumadocs' processed markdown: includes resolved, no frontmatter. */
  markdown: string;
  toc: ExportTocItem[];
  structuredData: ExportStructuredData | null;
}

/** `/docs-search.json`: every indexable page of a docs site. */
export interface ExportV1 {
  kind: 'docs-search-export';
  version: 1;
  /** `owner/repo` of the docs site. The index builder checks it against the site it is building. */
  repo: string;
  /** `@tetherto/docs-search@x.y.z`, the emitter that wrote it. */
  generator: string;
  trailingSlash: boolean;
  /** The commit the site was built from, if its build said. */
  commit?: string;
  /** Sorted by url. No timestamp: the same content gives the same bytes. */
  pages: ExportPage[];
}

export const EXPORT_KIND = 'docs-search-export';
export const EXPORT_VERSION = 1;

/** `owner/repo`, as GitHub spells them. */
export const REPO_PATTERN = /^[A-Za-z0-9][A-Za-z0-9-]{0,38}\/[A-Za-z0-9._-]{1,100}$/;

/**
 * A page path as the export and the index carry it: absolute on the site,
 * nothing that could climb out of it or change host.
 */
export function isSitePath(u: unknown): u is string {
  return (
    typeof u === 'string' &&
    u.startsWith('/') &&
    !u.startsWith('//') &&
    !/[\\\s?#\u0000-\u001f]/.test(u) &&
    !u.split('/').some((seg) => seg === '..' || seg === '.')
  );
}

export interface ExportLimits {
  maxPages?: number;
}

/**
 * `v` as an `ExportV1`, or a `ContractError`. Strict, because the index builder
 * reads an export from a public URL and must not trust it: every page url is a
 * site path, every field is the type it claims, and duplicate urls are refused.
 */
export function parseExport(v: unknown, limits: ExportLimits = {}): ExportV1 {
  if (!isObject(v)) throw new ContractError('the export is not an object');
  if (v.kind !== EXPORT_KIND) throw new ContractError(`kind is ${JSON.stringify(v.kind)}, not "${EXPORT_KIND}"`);
  if (v.version !== EXPORT_VERSION) throw new ContractError(`version is ${JSON.stringify(v.version)}, this reads version ${EXPORT_VERSION}`);
  if (typeof v.repo !== 'string' || !REPO_PATTERN.test(v.repo)) throw new ContractError('repo is not an owner/repo');
  if (typeof v.generator !== 'string') throw new ContractError('generator is not a string');
  if (typeof v.trailingSlash !== 'boolean') throw new ContractError('trailingSlash is not a boolean');
  if (v.commit !== undefined && typeof v.commit !== 'string') throw new ContractError('commit is not a string');
  if (!Array.isArray(v.pages)) throw new ContractError('pages is not an array');
  if (limits.maxPages !== undefined && v.pages.length > limits.maxPages) {
    throw new ContractError(`${v.pages.length} pages is over the limit of ${limits.maxPages}`);
  }

  const seen = new Set<string>();
  const pages = v.pages.map((p, i): ExportPage => {
    const at = `pages[${i}]`;
    if (!isObject(p)) throw new ContractError(`${at} is not an object`);
    if (!isSitePath(p.url)) throw new ContractError(`${at}.url is not a site path`);
    if (seen.has(p.url)) throw new ContractError(`${at}.url ${p.url} is listed twice`);
    seen.add(p.url);
    for (const k of ['title', 'description', 'markdown'] as const) {
      if (typeof p[k] !== 'string') throw new ContractError(`${at}.${k} is not a string`);
    }
    if (!Array.isArray(p.toc)) throw new ContractError(`${at}.toc is not an array`);
    const toc = p.toc.map((t, j): ExportTocItem => {
      if (!isObject(t) || typeof t.title !== 'string' || typeof t.url !== 'string' || !Number.isInteger(t.depth)) {
        throw new ContractError(`${at}.toc[${j}] is not {title, url, depth}`);
      }
      return { title: t.title, url: t.url, depth: t.depth as number };
    });
    return {
      url: p.url,
      title: p.title as string,
      description: p.description as string,
      markdown: p.markdown as string,
      toc,
      structuredData: parseStructuredData(p.structuredData, `${at}.structuredData`),
    };
  });
  return {
    kind: EXPORT_KIND,
    version: EXPORT_VERSION,
    repo: v.repo,
    generator: v.generator,
    trailingSlash: v.trailingSlash,
    ...(v.commit !== undefined && { commit: v.commit }),
    pages,
  };
}

function parseStructuredData(v: unknown, at: string): ExportStructuredData | null {
  if (v === null) return null;
  if (!isObject(v) || !Array.isArray(v.headings) || !Array.isArray(v.contents)) {
    throw new ContractError(`${at} is neither null nor {headings, contents}`);
  }
  return {
    headings: v.headings.map((h, i) => {
      if (!isObject(h) || typeof h.id !== 'string' || typeof h.content !== 'string') {
        throw new ContractError(`${at}.headings[${i}] is not {id, content}`);
      }
      return { id: h.id, content: h.content };
    }),
    contents: v.contents.map((c, i) => {
      if (!isObject(c) || typeof c.content !== 'string' || (c.heading !== undefined && typeof c.heading !== 'string')) {
        throw new ContractError(`${at}.contents[${i}] is not {heading?, content}`);
      }
      return c.heading === undefined ? { content: c.content } : { heading: c.heading, content: c.content };
    }),
  };
}
