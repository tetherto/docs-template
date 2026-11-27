# @tetherto/docs-search

Semantic search for a [Fumadocs](https://fumadocs.dev) site, backed by the QVAC
docs search service ([the QVAC docs search repo](https://github.com/tetherto/qvac-docs-search)). It has three parts, each usable on
its own:

| Subpath | What it is | Runs in |
| --- | --- | --- |
| `@tetherto/docs-search` | The search dialog (`createDocsSearchDialog`, `DocsSearchDialog`). One request to the service per settled query; the site's own search takes over when the service cannot answer. | the browser |
| `@tetherto/docs-search/mcp-install` | `McpInstallButton`: "Add to your AI tool", for Claude Code, Claude Desktop, Cursor, and VS Code. | the browser |
| `@tetherto/docs-search/export` | `createSearchExport`: the route that publishes every page for the service's index builder. | the build |
| `@tetherto/docs-search/inkeep` | `inkeepAskAI`: an "Ask AI" button for the dialog, backed by Inkeep. Optional. | the browser |
| `@tetherto/docs-search/client`, `/contract` | The HTTP client, and the types of the service's responses and of the export. No React. | anywhere |

Fumadocs 16.3.2 up to (not including) 17, React 19.2+.

## Install

The package is on GitHub Packages. Route the scope there in the site's `.npmrc`
(the other `@tetherto` packages need the same line) and give the install a token
that can read it:

```ini
@tetherto:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=${GITHUB_TOKEN}
```

```bash
npm install @tetherto/docs-search
```

Add `@inkeep/cxkit-react` only if you use `inkeepAskAI`.

## The search dialog

Create the dialog once, at module level of a client module, and give it to
`RootProvider`:

```tsx
// src/app/provider.tsx
'use client';
import { RootProvider } from 'fumadocs-ui/provider/next';
import { createDocsSearchDialog } from '@tetherto/docs-search';

const SearchDialog = createDocsSearchDialog({
  apiUrl: process.env.NEXT_PUBLIC_QVAC_API_URL!, // the service's origin; there is no default
});

export function Provider({ children }: { children: React.ReactNode }) {
  return <RootProvider search={{ SearchDialog }}>{children}</RootProvider>;
}
```

`createDocsSearchDialog` exists because `RootProvider` types `search.options` for
its own dialog, so `apiUrl` cannot go there. The dialog is also the default
export and `DocsSearchDialog`, with the same props, for `next/dynamic` or direct
use.

Add the package's classes to Tailwind v4, in the site's global style sheet, after
`@import 'tailwindcss'`:

```css
@import '@tetherto/docs-search/tailwind.css';
```

### Props

| Prop | Default | |
| --- | --- | --- |
| `apiUrl` | required | The service's origin. A trailing slash is ignored. |
| `topK` | `6` | Results to ask for (the service clamps to 1-20). |
| `debounceMs` | `400` | Pause after the last keystroke before searching. Each search is one embedding on a CPU box shared with the MCP server. |
| `minChars` | `3` | Characters needed before anything is searched. Under that the list is empty and nothing spins. |
| `timeoutMs` | `4000` | Give up on the service after this long. |
| `mapUrl` | | Rewrites a result's path, e.g. to add a base path. |
| `fallback` | | The site's own search, as `useDocsSearch` options. See below. |
| `askAI` | | An adapter that adds an Ask AI button and a row under the results. |
| `labels` | | `askAI` (button text) and `askAbout(query)` (row). |
| `links` | | `[name, href][]` listed while the box is empty. |
| `footer` | | Rendered under the list. |

### The fallback

When the service fails (a timeout, a network error, an error status, a response
that is not the contract), the dialog uses the site's own search for that query:

```tsx
const FALLBACK = { type: 'static', from: '/api/search.json', initOrama } as const; // module level
createDocsSearchDialog({ apiUrl, fallback: FALLBACK });
```

It is passed to Fumadocs' `useDocsSearch` as it is, so it takes whatever your
Fumadocs version does (`initOrama` up to 16.13, `initDB` from 16.14). Define it at
module level: it is compared by value on every render.

- It is loaded only after the service has failed once, so a site whose service
  works never downloads it nor its index.
- When the service answers `429` or `503` and says how long to leave it alone
  (`Retry-After`, or `retryAfter` in the body), later queries go straight to the
  fallback until that time has passed (at most five minutes). A success clears it.
- Without a `fallback`, a failed search shows no results.

### Ask AI with Inkeep

```tsx
import { inkeepAskAI } from '@tetherto/docs-search/inkeep';

const askAI = inkeepAskAI({
  apiKey: process.env.NEXT_PUBLIC_INKEEP_API_KEY, // empty: no adapter, so no Ask AI
  organizationDisplayName: 'WDK Docs',
  primaryBrandColor: { light: '#759300', dark: '#bbde5c' }, // Inkeep requires one
});
createDocsSearchDialog({ apiUrl, askAI });
```

Inkeep's SDK is loaded when the chat is first opened. Any other chat fits the
same slot: `askAI` is `{ Component }`, a component taking `{ open, onOpenChange,
question }`.

## The MCP install button

```tsx
import { McpInstallButton } from '@tetherto/docs-search/mcp-install';

// as the Fumadocs layout's sidebar banner
<McpInstallButton url={process.env.NEXT_PUBLIC_MCP_URL!} serverName="wdk-docs" />
```

`serverName` is required and must be unique per site, or two sites' servers
overwrite each other in a reader's client config. Use the service's
`QVAC_MCP_NAME`. An empty `url` renders nothing; a name or URL clients could not
take throws, which fails the site's build.

## The page export

The service's index is built from `/docs-search.json`, a route each site adds:

```ts
// src/app/docs-search.json/route.ts
import { source } from '@/lib/source';
import { createSearchExport } from '@tetherto/docs-search/export';

export const dynamic = 'force-static'; // literal here: Next reads it statically
export const revalidate = false;
export const { GET } = createSearchExport(source, {
  repo: 'tetherto/wdk-docs', // this site's GitHub repo
  trailingSlash: true,       // the site's own setting
});
```

The site's normal production build writes the file. It holds, for each page,
what Fumadocs knows: the loader's URL, title, description, the processed
Markdown, the table of contents and `structuredData`. Because the URLs come from
the loader, route groups, `baseUrl` and includes are right by construction.

- The collection needs `postprocess: { includeProcessedMarkdown: true }` in
  `source.config.ts`; the build fails with that hint without it.
- `repo` is checked when the route loads. The index builder compares it with the
  site it was told to read, so a copied config cannot publish one site's index as
  another's.
- Pages marked `noindex` are left out (`include` replaces that filter). Fumadocs' default frontmatter
  schema drops fields it does not know, so the site's own schema must keep `noindex` (for example with
  `.passthrough()`) for this to see it. Two pages
  with one URL are warned about and the first kept (`onDuplicate`: `warn`,
  `throw` or `ignore`); the index builder refuses duplicates.
- The output is sorted and has no timestamp, so the same content gives the same
  bytes.

## What the service needs

- **CORS.** Put the site's origin (and any preview origin you search from) in the
  service's `QVAC_ALLOWED_ORIGINS`. The service answers a browser only for
  origins on that list; a service that has not set it answers any origin.
- **`QVAC_SEARCH_PUBLIC=1`**, so `/api/search` needs no token: a static site
  cannot keep one secret.
- The dialog sends `Content-Type: text/plain`, so the request is a "simple" one
  and the browser sends no preflight.

## Development

```bash
# from the repository root (this is an npm workspace)
npm ci
npm run typecheck --workspace packages/docs-search
npm test --workspace packages/docs-search   # builds first; unit tests, and the components in a DOM
npm pack --dry-run --workspace packages/docs-search
```

CI runs the suite against the Fumadocs the lockfile has and the lowest supported, 16.3.2.
