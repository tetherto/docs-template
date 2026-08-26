import { source } from '@/lib/source';
import { createFromSource } from 'fumadocs-core/search/server';
import { structure } from 'fumadocs-core/mdx-plugins';
import { fetchExternalContent } from '@/lib/external-source';

// statically cached
export const revalidate = false;
export const { staticGET: GET } = createFromSource(source, {
  buildIndex: async (page) => {
    const content = 'external' in page.data && typeof page.data.external === 'string'
      ? await fetchExternalContent(page.data.external)
      : await page.data.getText('raw');

    return {
      title: page.data.title,
      description: page.data.description,
      url: page.url,
      id: page.url,
      structuredData: structure(content),
    };
  },
});