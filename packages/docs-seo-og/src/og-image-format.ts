export type OgImageFormat = 'webp' | 'png' | 'jpeg';

/** `jpeg` -> `image.jpg` (conventional extension); otherwise `image.<format>`. */
export function ogImageFileName(format: OgImageFormat = 'webp'): string {
  return format === 'jpeg' ? 'image.jpg' : `image.${format}`;
}

/**
 * Resolves the effective OG image format from a Takumi `format` option,
 * defaulting to `webp`. Rejects `raw` (pixel-buffer output has no valid
 * static-file/URL extension for an OG image).
 */
export function resolveOgImageFormat(
  requested: 'webp' | 'png' | 'jpeg' | 'raw' | undefined,
): OgImageFormat {
  if (requested === undefined) return 'webp';
  if (requested === 'raw') {
    throw new Error(
      'OG images cannot use format "raw"; use "webp", "png", or "jpeg".',
    );
  }
  return requested;
}
