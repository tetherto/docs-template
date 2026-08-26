const externalContentCache = new Map<string, Promise<string>>();

export function fetchExternalContent(url: string): Promise<string> {
  const cached = externalContentCache.get(url);
  if (cached) return cached;

  const request = loadExternalContent(url);
  externalContentCache.set(url, request);
  return request;
}

async function loadExternalContent(url: string): Promise<string> {
  const parsedUrl = new URL(url);

  if (parsedUrl.protocol !== 'http:' && parsedUrl.protocol !== 'https:') {
    throw new Error(`Unsupported external content URL: ${url}`);
  }

  const response = await fetch(parsedUrl, { cache: 'force-cache' });

  if (!response.ok) {
    throw new Error(
      `Failed to fetch external content ${parsedUrl.toString()}: ${response.status} ${response.statusText}`,
    );
  }

  return response.text();
}
