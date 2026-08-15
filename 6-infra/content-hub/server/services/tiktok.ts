import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTikTokVideos, saveTikTokVideos } from '../db/index.js';
import { supabase } from '../db/client.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSER_PROFILE = path.resolve(__dirname, '../../data/browser-profile');
const CACHE_PATH = path.resolve(__dirname, '../../data/tiktok-videos.json');
const THUMB_DIR = path.resolve(__dirname, '../../data/tiktok-thumbs');

const SUPABASE_URL = process.env.SUPABASE_URL || 'https://vdaualgktroizsttbrfh.supabase.co';
const THUMB_BUCKET = 'thumbnails';

export interface TikTokVideo {
  id: string;
  title: string;
  thumbnail: string;
  url: string;
  createTime: string;
  duration: number;
  viewCount: number;
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

interface SyncResult {
  videos: TikTokVideo[];
  syncedAt: string;
  source: 'scrape' | 'cache';
}

function readCache(): SyncResult | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (data.videos && data.syncedAt) return data;
  } catch {}
  return null;
}

function writeCache(videos: TikTokVideo[]) {
  const data: SyncResult = { videos, syncedAt: new Date().toISOString(), source: 'scrape' };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getCachedTikTokVideos(): Promise<SyncResult> {
  try { const db = await getTikTokVideos(); if (db.videos.length > 0) return db; } catch {}
  const cache = readCache();
  if (cache) return { ...cache, source: 'cache' };
  return { videos: [], syncedAt: '', source: 'cache' };
}

export async function scrapeTikTokProfile(handle: string): Promise<SyncResult> {
  console.log(`[TikTok] Scraping profile @${handle}...`);

  if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true });

  const isProduction = process.env.NODE_ENV === 'production';
  const browser = await chromium.launchPersistentContext(BROWSER_PROFILE, {
    headless: isProduction,
    ...(isProduction ? {} : { channel: 'chrome' }),
    args: ['--disable-blink-features=AutomationControlled', ...(isProduction ? ['--no-sandbox'] : [])],
  });

  try {
    const page = browser.pages()[0] || await browser.newPage();

    // Intercept API responses to capture video data
    const capturedVideos: any[] = [];

    page.on('response', async (response: any) => {
      try {
        const url = response.url();
        // TikTok internal API for user's video list
        if (url.includes('/api/post/item_list') || url.includes('/api/creator/item_list') || url.includes('item_list')) {
          const json = await response.json();
          if (json.itemList) {
            capturedVideos.push(...json.itemList);
            console.log(`[TikTok] Captured ${json.itemList.length} videos from API response`);
          } else if (json.items) {
            capturedVideos.push(...json.items);
            console.log(`[TikTok] Captured ${json.items.length} videos from API response`);
          }
        }
      } catch {}
    });

    // Navigate
    await page.goto(`https://www.tiktok.com/@${handle}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Check login
    const url = page.url();
    if (url.includes('/login') || url.includes('login_redirect')) {
      console.log('[TikTok] Login required — waiting for user...');
      await page.waitForURL(`**/tiktok.com/@${handle}**`, { timeout: 180000 });
    }

    // Wait for initial load
    await page.waitForTimeout(5000);

    // Scroll down to trigger loading more videos
    for (let i = 0; i < 3; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);
    }

    console.log(`[TikTok] Captured ${capturedVideos.length} videos via API interception`);

    let videos: TikTokVideo[] = [];

    // Method 1: Use intercepted API data (best quality)
    if (capturedVideos.length > 0) {
      videos = capturedVideos.map((item: any) => parseApiItem(item, handle));
      console.log(`[TikTok] Parsed ${videos.length} videos from API data`);
    }

    // Method 2: Try JSON from page
    if (videos.length === 0) {
      console.log('[TikTok] No API data captured, trying page JSON...');
      const data = await page.evaluate(`
        (function() {
          var el = document.getElementById('__UNIVERSAL_DATA_FOR_REHYDRATION__');
          if (el && el.textContent) { try { return JSON.parse(el.textContent); } catch(e) {} }
          var el2 = document.getElementById('SIGI_STATE');
          if (el2 && el2.textContent) { try { return JSON.parse(el2.textContent); } catch(e) {} }
          if (window.__UNIVERSAL_DATA_FOR_REHYDRATION__) return window.__UNIVERSAL_DATA_FOR_REHYDRATION__;
          return null;
        })()
      `);

      if (data) {
        console.log('[TikTok] Page JSON keys:', Object.keys(data));
        videos = extractFromPageJson(data, handle);
        console.log(`[TikTok] Extracted ${videos.length} from page JSON`);
      }
    }

    // Method 3: DOM fallback (least data)
    if (videos.length === 0) {
      console.log('[TikTok] Falling back to DOM scrape...');
      videos = await scrapeDOM(page, handle);
      console.log(`[TikTok] DOM scrape got ${videos.length} videos`);
    }

    // Deduplicate
    const seen = new Set<string>();
    videos = videos.filter((v) => {
      if (seen.has(v.id)) return false;
      seen.add(v.id);
      return true;
    });

    console.log(`[TikTok] Final: ${videos.length} unique videos`);

    // Download thumbnails → Supabase Storage (persistent) with local fallback
    for (const v of videos) {
      try {
        if (v.thumbnail && v.thumbnail.startsWith('http')) {
          const storagePath = `bruno-tiktok/${v.id}.jpg`;
          const publicUrl = `${SUPABASE_URL}/storage/v1/object/public/${THUMB_BUCKET}/${storagePath}`;

          // Check if already in Supabase Storage
          const { data: existing } = await supabase.storage.from(THUMB_BUCKET).list('bruno-tiktok', { search: `${v.id}.jpg`, limit: 1 });
          if (existing && existing.length > 0) {
            v.thumbnail = publicUrl;
            continue;
          }

          // Download and upload to Supabase Storage
          const resp = await page.request.get(v.thumbnail);
          const body = await resp.body();
          if (body.length > 1000) {
            await supabase.storage.from(THUMB_BUCKET).upload(storagePath, body, { contentType: 'image/jpeg', upsert: true });
            v.thumbnail = publicUrl;
            // Also save locally as fallback
            try { if (!fs.existsSync(THUMB_DIR)) fs.mkdirSync(THUMB_DIR, { recursive: true }); fs.writeFileSync(path.join(THUMB_DIR, `${v.id}.jpg`), body); } catch {}
          }
        }
      } catch {}
    }

    const syncedAt = new Date().toISOString();
    writeCache(videos);
    try { await saveTikTokVideos(videos, syncedAt); } catch (e: any) { console.error('[TikTok] DB write error:', e.message); }
    return { videos, syncedAt, source: 'scrape' };
  } finally {
    await browser.close();
  }
}

function parseApiItem(item: any, handle: string): TikTokVideo {
  const stats = item.stats || {};
  const statsV2 = item.statsV2 || {};
  return {
    id: String(item.id),
    title: item.desc || '',
    thumbnail: item.video?.cover || item.video?.dynamicCover || item.video?.originCover || '',
    url: `https://www.tiktok.com/@${handle}/video/${item.id}`,
    createTime: new Date((item.createTime || 0) * 1000).toISOString(),
    duration: item.video?.duration || 0,
    viewCount: Number(statsV2.playCount || stats.playCount || 0),
    likeCount: Number(statsV2.diggCount || stats.diggCount || 0),
    commentCount: Number(statsV2.commentCount || stats.commentCount || 0),
    shareCount: Number(statsV2.shareCount || stats.shareCount || 0),
  };
}

function extractFromPageJson(data: any, handle: string): TikTokVideo[] {
  const videos: TikTokVideo[] = [];
  try {
    const scope = data['__DEFAULT_SCOPE__'] || data;

    // Try various known paths
    const paths = [
      scope['webapp.user-detail']?.itemList,
      scope['ItemModule'],
      data['ItemModule'],
    ];

    for (const source of paths) {
      if (!source) continue;
      const items = Array.isArray(source) ? source : Object.values(source);
      for (const item of items as any[]) {
        if (!item?.id) continue;
        videos.push(parseApiItem(item, handle));
      }
      if (videos.length > 0) break;
    }
  } catch (e) {
    console.error('[TikTok] JSON parse error:', e);
  }
  return videos;
}

async function scrapeDOM(page: any, handle: string): Promise<TikTokVideo[]> {
  const rawVideos = await page.evaluate(`
    (function() {
      var videos = [];
      var cards = document.querySelectorAll('[data-e2e="user-post-item"]');
      if (cards.length === 0) cards = document.querySelectorAll('[class*="DivItemContainer"]');
      if (cards.length === 0) cards = document.querySelectorAll('[class*="video-feed"] a[href*="/video/"]');

      for (var i = 0; i < cards.length; i++) {
        try {
          var card = cards[i];
          var link = card.tagName === 'A' ? card : card.querySelector('a[href*="/video/"]');
          var img = card.querySelector('img');

          var href = link ? link.href : '';
          var idMatch = href.match(/video\\/(\\d+)/);
          if (!idMatch) continue;

          var viewsEl = card.querySelector('[data-e2e="video-views"]');
          var viewsText = viewsEl ? viewsEl.textContent.trim() : '0';

          videos.push({
            id: idMatch[1],
            title: img ? (img.alt || '') : '',
            thumbnail: img ? (img.src || '') : '',
            url: href,
            viewsText: viewsText
          });
        } catch(e) {}
      }
      return videos;
    })()
  `);

  return (rawVideos || []).map((v: any) => ({
    id: v.id,
    title: v.title,
    thumbnail: v.thumbnail,
    url: v.url || `https://www.tiktok.com/@${handle}/video/${v.id}`,
    createTime: '', // Can't get from DOM
    duration: 0,
    viewCount: parseViewsText(v.viewsText || '0'),
    likeCount: 0,
    commentCount: 0,
    shareCount: 0,
  }));
}

function parseViewsText(text: string): number {
  const clean = text.trim().toLowerCase();
  if (clean.includes('m')) return Math.round(parseFloat(clean) * 1_000_000);
  if (clean.includes('k')) return Math.round(parseFloat(clean) * 1_000);
  return parseInt(clean.replace(/\D/g, '')) || 0;
}
