import type { MetadataRoute } from 'next';
import {
  buildDocsSitemap,
  type DocsSitemapSource,
} from '@tetherto/docs-seo-next';
import { source } from '@/lib/source';
import { getDocsSeoConfig } from '@/lib/seo-config';

export const dynamic = 'force-static';

export default function sitemap(): MetadataRoute.Sitemap {
  return buildDocsSitemap(source as unknown as DocsSitemapSource, getDocsSeoConfig());
}
