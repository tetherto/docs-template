import { source } from '@/lib/source';
import { fetchExternalContent } from '@/lib/external-source';
import type { InferPageType } from 'fumadocs-core/source';

export async function getLLMText(page: InferPageType<typeof source>) {
  const processed = 'external' in page.data && typeof page.data.external === 'string'
    ? await fetchExternalContent(page.data.external)
    : await page.data.getText('processed');

  return `# ${page.data.title} (${page.url})

${processed}`;
}