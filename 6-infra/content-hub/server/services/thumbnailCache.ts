import { supabase } from '../db/client.js';

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co';
const BUCKET = 'thumbnails';

/**
 * Get the public URL for a cached thumbnail.
 */
function publicUrl(path: string): string {
  return `${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${path}`;
}

/**
 * Check if a thumbnail is already cached and return its public URL.
 */
async function getCachedThumb(competitorId: string, itemId: string): Promise<string | null> {
  const path = `${competitorId}/${itemId}.jpg`;
  // Try to get file metadata — if it exists, return the public URL
  const { data } = await supabase.storage.from(BUCKET).list(competitorId, {
    search: `${itemId}.jpg`,
    limit: 1,
  });
  if (data && data.length > 0) {
    return publicUrl(path);
  }
  return null;
}

/**
 * Download an image from a URL and cache it in Supabase Storage.
 * Returns the public URL of the cached image, or null on failure.
 */
async function cacheThumb(competitorId: string, itemId: string, originalUrl: string): Promise<string | null> {
  if (!originalUrl) return null;

  const path = `${competitorId}/${itemId}.jpg`;

  try {
    const res = await fetch(originalUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Referer': new URL(originalUrl).origin,
      },
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return null;

    const buffer = Buffer.from(await res.arrayBuffer());
    if (buffer.length < 100) return null; // too small, probably an error page

    const contentType = res.headers.get('content-type') || 'image/jpeg';

    const { error } = await supabase.storage.from(BUCKET).upload(path, buffer, {
      contentType,
      upsert: true,
    });

    if (error) {
      console.error(`[thumb-cache] Upload error for ${path}:`, error.message);
      return null;
    }

    return publicUrl(path);
  } catch (err: any) {
    // Silent fail — thumbnails are non-critical
    return null;
  }
}

/**
 * For a list of content items, cache thumbnails for non-YouTube platforms.
 * Mutates items in place, replacing thumbnail with cached Supabase URL.
 * Skips items that already have a cached thumbnail (Supabase URL).
 */
export async function cacheItemThumbnails(
  competitorId: string,
  platform: string,
  items: { id: string; thumbnail: string | null }[],
): Promise<number> {
  // YouTube thumbnails are permanent, no need to cache
  if (platform === 'youtube') return 0;

  let cached = 0;
  const BATCH_SIZE = 5; // process 5 at a time to avoid overwhelming

  for (let i = 0; i < items.length; i += BATCH_SIZE) {
    const batch = items.slice(i, i + BATCH_SIZE);
    const promises = batch.map(async (item) => {
      if (!item.id) return;

      // Already cached (Supabase URL)
      if (item.thumbnail?.includes('supabase.co/storage')) return;

      // Check if already in storage
      const existing = await getCachedThumb(competitorId, item.id);
      if (existing) {
        item.thumbnail = existing;
        cached++;
        return;
      }

      // Original URL exists — download and cache
      if (item.thumbnail) {
        const url = await cacheThumb(competitorId, item.id, item.thumbnail);
        if (url) {
          item.thumbnail = url;
          cached++;
        }
        return;
      }

      // No thumbnail at all — try platform-specific methods
      if (platform === 'tiktok') {
        // TikTok: try to get thumbnail from web page via oembed
        const tiktokThumb = await fetchTikTokThumb(item.id);
        if (tiktokThumb) {
          const url = await cacheThumb(competitorId, item.id, tiktokThumb);
          if (url) {
            item.thumbnail = url;
            cached++;
          }
        }
      }
    });

    await Promise.all(promises);
  }

  if (cached > 0) {
    console.log(`[thumb-cache] Cached ${cached} thumbnails for ${competitorId}/${platform}`);
  }

  return cached;
}

/**
 * Try to get TikTok video thumbnail via oembed API (no auth needed).
 */
async function fetchTikTokThumb(videoId: string): Promise<string | null> {
  try {
    // TikTok oembed API returns thumbnail_url
    const url = `https://www.tiktok.com/oembed?url=https://www.tiktok.com/@_/video/${videoId}`;
    const res = await fetch(url, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      signal: AbortSignal.timeout(10_000),
    });
    if (!res.ok) return null;
    const json = await res.json();
    return json.thumbnail_url || null;
  } catch {
    return null;
  }
}
