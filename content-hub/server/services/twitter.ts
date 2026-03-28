import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getTwitterPosts, saveTwitterPosts } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSER_PROFILE = path.resolve(__dirname, '../../../_opensquad/_browser_profile');
const CACHE_PATH = path.resolve(__dirname, '../../data/twitter-posts.json');

export interface TwitterPost {
  id: string;
  text: string;
  permalink: string;
  createdAt: string;
  likeCount: number;
  retweetCount: number;
  replyCount: number;
  viewCount: number;
  mediaUrl?: string;
}

interface SyncResult {
  posts: TwitterPost[];
  syncedAt: string;
  source: 'scrape' | 'cache';
}

function readCache(): SyncResult | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (data.posts && data.syncedAt) return data;
  } catch {}
  return null;
}

function writeCache(posts: TwitterPost[]) {
  const data: SyncResult = { posts, syncedAt: new Date().toISOString(), source: 'scrape' };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getCachedTwitterPosts(): Promise<SyncResult> {
  try { const db = await getTwitterPosts(); if (db.posts.length > 0) return db; } catch {}
  const cache = readCache();
  if (cache) return { ...cache, source: 'cache' };
  return { posts: [], syncedAt: '', source: 'cache' };
}

export async function scrapeTwitterProfile(handle: string): Promise<SyncResult> {
  console.log(`[Twitter] Scraping profile @${handle}...`);

  const isProduction = process.env.NODE_ENV === 'production';
  const browser = await chromium.launchPersistentContext(BROWSER_PROFILE, {
    headless: isProduction,
    ...(isProduction ? {} : { channel: 'chrome' }),
    args: ['--disable-blink-features=AutomationControlled', ...(isProduction ? ['--no-sandbox'] : [])],
  });

  try {
    const page = browser.pages()[0] || await browser.newPage();

    // Intercept API responses to capture tweet data
    const capturedTweets: any[] = [];

    page.on('response', async (response: any) => {
      try {
        const url = response.url();
        if (url.includes('/UserTweets') || url.includes('/UserByScreenName') || url.includes('TweetResultsByRestId')) {
          const json = await response.json();
          const tweets = extractTweetsFromApiResponse(json);
          if (tweets.length > 0) {
            capturedTweets.push(...tweets);
            console.log(`[Twitter] Captured ${tweets.length} tweets from API response`);
          }
        }
      } catch {}
    });

    // Navigate
    await page.goto(`https://x.com/${handle}`, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Check login — wait longer so user has time to log in
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/i/flow/login') || currentUrl.includes('redirect_after_login')) {
      console.log('[Twitter] Login required — waiting up to 5 minutes for user to log in...');
      await page.waitForURL((url) => url.toString().includes(`x.com/${handle}`), { timeout: 300000 });
      console.log('[Twitter] Login detected! Continuing...');
    }

    // Also check if login modal appeared on profile page (X shows overlay)
    const loginModal = await page.$('[data-testid="loginButton"], [data-testid="signupButton"]');
    if (loginModal) {
      console.log('[Twitter] Login modal detected — waiting for user to log in...');
      await page.waitForSelector('article[data-testid="tweet"]', { timeout: 300000 });
      console.log('[Twitter] Tweets visible, login complete!');
    }

    // Wait for initial load
    await page.waitForTimeout(5000);

    // Scroll down to trigger loading more tweets
    for (let i = 0; i < 3; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);
    }

    console.log(`[Twitter] Captured ${capturedTweets.length} tweets via API interception`);

    let posts: TwitterPost[] = [];

    // Method 1: Use intercepted API data (best quality)
    if (capturedTweets.length > 0) {
      posts = capturedTweets.map((tweet: any) => parseApiTweet(tweet, handle));
      console.log(`[Twitter] Parsed ${posts.length} tweets from API data`);
    }

    // Method 2: Try JSON from page
    if (posts.length === 0) {
      console.log('[Twitter] No API data captured, trying page JSON...');
      const data = await page.evaluate(`
        (function() {
          var el = document.getElementById('__NEXT_DATA__');
          if (el && el.textContent) { try { return JSON.parse(el.textContent); } catch(e) {} }
          if (window.__NEXT_DATA__) return window.__NEXT_DATA__;
          return null;
        })()
      `);

      if (data) {
        console.log('[Twitter] Page JSON keys:', Object.keys(data));
        posts = extractFromPageJson(data, handle);
        console.log(`[Twitter] Extracted ${posts.length} from page JSON`);
      }
    }

    // Method 3: DOM fallback (least data)
    if (posts.length === 0) {
      console.log('[Twitter] Falling back to DOM scrape...');
      posts = await scrapeDOM(page, handle);
      console.log(`[Twitter] DOM scrape got ${posts.length} tweets`);
    }

    // Deduplicate
    const seen = new Set<string>();
    posts = posts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    console.log(`[Twitter] Final: ${posts.length} unique tweets`);

    const syncedAt = new Date().toISOString();
    writeCache(posts);
    try { await saveTwitterPosts(posts, syncedAt); } catch (e: any) { console.error('[Twitter] DB write error:', e.message); }
    return { posts, syncedAt, source: 'scrape' };
  } finally {
    await browser.close();
  }
}

function extractTweetsFromApiResponse(json: any): any[] {
  const tweets: any[] = [];
  try {
    // Navigate the GraphQL response structure
    const instructions = json?.data?.user?.result?.timeline_v2?.timeline?.instructions
      || json?.data?.user?.result?.timeline?.timeline?.instructions
      || [];

    for (const instruction of instructions) {
      const entries = instruction?.entries || [];
      for (const entry of entries) {
        const result = entry?.content?.itemContent?.tweet_results?.result
          || entry?.content?.content?.tweetResult?.result;
        if (result) {
          tweets.push(result);
        }

        // Handle module items (conversations, etc.)
        const items = entry?.content?.items || [];
        for (const item of items) {
          const itemResult = item?.item?.itemContent?.tweet_results?.result;
          if (itemResult) {
            tweets.push(itemResult);
          }
        }
      }
    }
  } catch {}
  return tweets;
}

function parseApiTweet(tweet: any, handle: string): TwitterPost {
  const legacy = tweet.legacy || tweet;
  const core = tweet.core?.user_results?.result?.legacy || {};
  const tweetId = legacy.id_str || tweet.rest_id || '';
  const metrics = legacy.public_metrics || {};

  // Try to get media URL
  const media = legacy.entities?.media?.[0] || legacy.extended_entities?.media?.[0];
  const mediaUrl = media?.media_url_https || media?.media_url || '';

  return {
    id: tweetId,
    text: legacy.full_text || legacy.text || '',
    permalink: `https://x.com/${handle}/status/${tweetId}`,
    createdAt: legacy.created_at ? new Date(legacy.created_at).toISOString() : '',
    likeCount: Number(legacy.favorite_count || metrics.like_count || 0),
    retweetCount: Number(legacy.retweet_count || metrics.retweet_count || 0),
    replyCount: Number(legacy.reply_count || metrics.reply_count || 0),
    viewCount: Number(tweet.views?.count || 0),
    mediaUrl: mediaUrl || undefined,
  };
}

function extractFromPageJson(data: any, handle: string): TwitterPost[] {
  const posts: TwitterPost[] = [];
  try {
    // Recursively search for tweet-like objects
    const jsonStr = JSON.stringify(data);
    const tweetIdPattern = /"id_str"\s*:\s*"(\d+)"/g;
    let match;
    const ids = new Set<string>();
    while ((match = tweetIdPattern.exec(jsonStr)) !== null) {
      ids.add(match[1]);
    }

    if (ids.size > 0) {
      console.log(`[Twitter] Found ${ids.size} tweet IDs in page JSON`);
    }
  } catch (e) {
    console.error('[Twitter] JSON parse error:', e);
  }
  return posts;
}

async function scrapeDOM(page: any, handle: string): Promise<TwitterPost[]> {
  const rawTweets = await page.evaluate(`
    (function() {
      var tweets = [];
      var articles = document.querySelectorAll('article[data-testid="tweet"]');

      for (var i = 0; i < articles.length; i++) {
        try {
          var article = articles[i];

          // Get tweet link (contains the tweet ID)
          var timeEl = article.querySelector('time');
          var linkEl = timeEl ? timeEl.closest('a') : null;
          var href = linkEl ? linkEl.href : '';
          var idMatch = href.match(/status\\/(\\d+)/);
          if (!idMatch) continue;

          // Get text
          var textEl = article.querySelector('[data-testid="tweetText"]');
          var text = textEl ? textEl.textContent.trim() : '';

          // Get metrics from aria-labels or specific elements
          var likeBtn = article.querySelector('[data-testid="like"] span, [data-testid="unlike"] span');
          var retweetBtn = article.querySelector('[data-testid="retweet"] span');
          var replyBtn = article.querySelector('[data-testid="reply"] span');

          var likeCount = likeBtn ? likeBtn.textContent.trim() : '0';
          var retweetCount = retweetBtn ? retweetBtn.textContent.trim() : '0';
          var replyCount = replyBtn ? replyBtn.textContent.trim() : '0';

          // Get view count if visible
          var viewEl = article.querySelector('a[href*="/analytics"] span');
          var viewCount = viewEl ? viewEl.textContent.trim() : '0';

          // Get media
          var imgEl = article.querySelector('[data-testid="tweetPhoto"] img');
          var mediaUrl = imgEl ? imgEl.src : '';

          // Get timestamp
          var datetime = timeEl ? timeEl.getAttribute('datetime') : '';

          tweets.push({
            id: idMatch[1],
            text: text,
            href: href,
            createdAt: datetime,
            likeCount: likeCount,
            retweetCount: retweetCount,
            replyCount: replyCount,
            viewCount: viewCount,
            mediaUrl: mediaUrl
          });
        } catch(e) {}
      }
      return tweets;
    })()
  `);

  return (rawTweets || []).map((t: any) => ({
    id: t.id,
    text: t.text,
    permalink: t.href || `https://x.com/${handle}/status/${t.id}`,
    createdAt: t.createdAt || '',
    likeCount: parseMetricText(t.likeCount || '0'),
    retweetCount: parseMetricText(t.retweetCount || '0'),
    replyCount: parseMetricText(t.replyCount || '0'),
    viewCount: parseMetricText(t.viewCount || '0'),
    mediaUrl: t.mediaUrl || undefined,
  }));
}

function parseMetricText(text: string): number {
  const clean = text.trim().toLowerCase();
  if (clean.includes('m')) return Math.round(parseFloat(clean) * 1_000_000);
  if (clean.includes('k')) return Math.round(parseFloat(clean) * 1_000);
  return parseInt(clean.replace(/\D/g, '')) || 0;
}
