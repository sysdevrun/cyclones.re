/**
 * Image preloader utility for satellite images.
 * Preloads images into browser cache before animation starts.
 */

// Track preloaded image URLs to avoid duplicate loads
const preloadedUrls = new Set<string>();

/**
 * Preload a single image into browser cache
 */
export function preloadImage(url: string): Promise<void> {
  // Skip if already preloaded
  if (preloadedUrls.has(url)) {
    return Promise.resolve();
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      preloadedUrls.add(url);
      resolve();
    };
    img.onerror = () => {
      // Don't fail on image load errors, just continue
      console.warn(`Failed to preload image: ${url}`);
      resolve();
    };
    img.src = url;
  });
}

/**
 * Preload multiple images in parallel
 */
export async function preloadImages(urls: string[]): Promise<void> {
  await Promise.all(urls.map(preloadImage));
}

/**
 * Check if an image URL has been preloaded
 */
export function isPreloaded(url: string): boolean {
  return preloadedUrls.has(url);
}

/**
 * Clear the preload cache (useful for testing or memory management)
 */
export function clearPreloadCache(): void {
  preloadedUrls.clear();
}
