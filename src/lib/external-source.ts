const contentCache = new Map<string, { content: string; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000;

export async function fetchExternalContent(url: string): Promise<string> {
  const cached = contentCache.get(url);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.content;
  }

  let content: string;

  if (url.startsWith('file://') || url.startsWith('/')) {
    const fs = await import('node:fs');
    const filePath = url.startsWith('file://') ? url.slice(7) : url;
    content = fs.readFileSync(filePath, 'utf8');
  } else {
    const response = await fetch(url, {
      next: { revalidate: 3600 },
      headers: {
        'User-Agent': 'docs-template-external-source',
      },
    });

    if (!response.ok) {
      if (response.status === 429 && cached) {
        return cached.content;
      }

      throw new Error(`Failed to fetch external content: ${response.statusText}`);
    }

    content = await response.text();
  }

  const frontmatterMatch = content.match(/^---\r?\n[\s\S]*?\r?\n---\r?\n/);
  if (frontmatterMatch) {
    content = content.slice(frontmatterMatch[0].length);
  }

  content = content.replace(/^\s*(?:import|export)\s+[^\n]*$/gm, '');

  contentCache.set(url, { content, timestamp: Date.now() });

  return content;
}
