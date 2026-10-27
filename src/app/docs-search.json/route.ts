import { source } from '@/lib/source';
import { createSearchExport } from '@tetherto/docs-search/export';

// The page export the QVAC docs search service builds this site's index from.
// Harmless when no service is configured: it is one more static file.
export const dynamic = 'force-static'; // literal here: Next reads it statically
export const revalidate = false;
export const { GET } = createSearchExport(source, {
  // This site's GitHub repo; the index builder checks it against the site it reads.
  repo: process.env.NEXT_PUBLIC_DOCS_REPO ?? 'tetherto/docs-template',
  trailingSlash: true, // next.config.mjs
});
