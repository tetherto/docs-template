import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { precomputeTakumiOgImages } from '@tetherto/docs-seo-og/build';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');

await precomputeTakumiOgImages({
  contentDocsDir: path.join(root, 'content/docs'),
  publicDir: path.join(root, 'public'),
  site: process.env.DOCS_OG_SITE_LABEL ?? 'Tether',
  ogRouteBase: '/og/docs',
  concurrency: Number(process.env.DOCS_OG_CONCURRENCY ?? '3') || 3,
});
