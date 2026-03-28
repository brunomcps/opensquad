import { chromium } from 'playwright-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BROWSER_PROFILE = path.resolve(__dirname, '../../../_opensquad/_browser_profile');
const CACHE_PATH = path.resolve(__dirname, '../../data/linkedin-posts.json');

const HANDLE = process.env.LINKEDIN_HANDLE || '';

export interface LinkedInPost {
  id: string;
  text: string;
  permalink: string;
  createdAt: string;
  likeCount: number;
  commentCount: number;
  shareCount: number;
  mediaUrl?: string;
}

interface SyncResult {
  posts: LinkedInPost[];
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

function writeCache(posts: LinkedInPost[]) {
  const data: SyncResult = { posts, syncedAt: new Date().toISOString(), source: 'scrape' };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getCachedLinkedInPosts(): SyncResult {
  const cache = readCache();
  if (cache) return { ...cache, source: 'cache' };
  return { posts: [], syncedAt: '', source: 'cache' };
}

function parseMetric(text: string): number {
  if (!text) return 0;
  const clean = text.replace(/[,.\s]/g, '').toLowerCase();
  const match = clean.match(/([\d]+)/);
  if (!match) return 0;
  const num = parseInt(match[1], 10);
  if (clean.includes('k') || clean.includes('mil')) return num * 1000;
  if (clean.includes('m') || clean.includes('mi')) return num * 1000000;
  return num;
}

export async function scrapeLinkedInProfile(handle: string): Promise<SyncResult> {
  console.log(`[LinkedIn] Scraping profile: ${handle}...`);

  const isProduction = process.env.NODE_ENV === 'production';
  const browser = await chromium.launchPersistentContext(BROWSER_PROFILE, {
    headless: isProduction,
    ...(isProduction ? {} : { channel: 'chrome' }),
    args: ['--disable-blink-features=AutomationControlled', ...(isProduction ? ['--no-sandbox'] : [])],
  });

  try {
    const page = browser.pages()[0] || await browser.newPage();

    // Intercept API responses
    const capturedPosts: any[] = [];

    page.on('response', async (response: any) => {
      try {
        const url = response.url();
        if (url.includes('/voyager/api/feed/updates') || url.includes('/voyager/api/identity/dash/profile') || url.includes('graphql') && url.includes('feedUpdate')) {
          const json = await response.json();
          if (json.included) {
            capturedPosts.push(...json.included.filter((item: any) =>
              item.$type === 'com.linkedin.voyager.feed.render.UpdateV2' ||
              item.commentary ||
              item.$type === 'com.linkedin.voyager.feed.shared.UpdateV2'
            ));
            console.log(`[LinkedIn] Captured ${capturedPosts.length} items from API`);
          }
          if (json.data?.feedDashProfileUpdatesByMemberShareFeed?.elements) {
            capturedPosts.push(...json.data.feedDashProfileUpdatesByMemberShareFeed.elements);
            console.log(`[LinkedIn] Captured ${capturedPosts.length} items from GraphQL`);
          }
        }
      } catch {}
    });

    // Navigate to profile's activity/posts
    const profileUrl = handle.startsWith('http') ? handle : `https://www.linkedin.com/in/${handle}/recent-activity/all/`;
    await page.goto(profileUrl, { waitUntil: 'domcontentloaded', timeout: 120000 });

    // Check login
    await page.waitForTimeout(3000);
    const currentUrl = page.url();
    if (currentUrl.includes('/login') || currentUrl.includes('/checkpoint')) {
      console.log('[LinkedIn] Login required — waiting up to 5 minutes...');
      await page.waitForURL((url) => url.toString().includes('linkedin.com/in/'), { timeout: 300000 });
      console.log('[LinkedIn] Login complete!');
    }

    // Wait for posts to load
    await page.waitForTimeout(5000);

    // Scroll to load more posts
    for (let i = 0; i < 3; i++) {
      await page.evaluate('window.scrollTo(0, document.body.scrollHeight)');
      await page.waitForTimeout(2000);
    }

    let posts: LinkedInPost[] = [];

    // Method 1: API interception
    if (capturedPosts.length > 0) {
      posts = capturedPosts
        .filter((p: any) => p.commentary || p.header || p.resharedUpdate)
        .map((p: any) => {
          const id = p.updateUrn || p.urn || p.entityUrn || `li-${Date.now()}-${Math.random().toString(36).slice(2)}`;
          const text = p.commentary?.text?.text || p.commentary?.text || '';
          const createdAt = p.actor?.subDescription?.text || '';
          const socialCounts = p.socialDetail?.totalSocialActivityCounts || {};
          return {
            id,
            text,
            permalink: `https://www.linkedin.com/feed/update/${id.split(',')[0] || id}`,
            createdAt: createdAt || new Date().toISOString(),
            likeCount: socialCounts.numLikes || 0,
            commentCount: socialCounts.numComments || 0,
            shareCount: socialCounts.numShares || 0,
            mediaUrl: '',
          };
        });
      console.log(`[LinkedIn] Parsed ${posts.length} posts from API data`);
    }

    // Method 2: DOM scraping fallback
    if (posts.length === 0) {
      console.log('[LinkedIn] No API data, falling back to DOM scrape...');
      posts = await page.evaluate(() => {
        const results: any[] = [];
        const articles = document.querySelectorAll('.feed-shared-update-v2, .profile-creator-shared-feed-update__container, [data-urn*="urn:li:activity"]');
        articles.forEach((article, i) => {
          const textEl = article.querySelector('.feed-shared-text__text-view, .update-components-text, .break-words');
          const text = textEl?.textContent?.trim() || '';
          const urn = article.getAttribute('data-urn') || `li-dom-${i}`;
          const timeEl = article.querySelector('.feed-shared-actor__sub-description, time, .update-components-actor__sub-description');
          const createdAt = timeEl?.textContent?.trim() || '';

          // Metrics
          const metricsEls = article.querySelectorAll('.social-details-social-counts__reactions-count, .social-details-social-counts__comments, .social-details-social-counts__item');
          const metrics: string[] = [];
          metricsEls.forEach(el => metrics.push(el.textContent?.trim() || ''));

          if (text) {
            results.push({
              id: urn,
              text: text.slice(0, 500),
              permalink: `https://www.linkedin.com/feed/update/${urn}`,
              createdAt,
              likeCount: 0,
              commentCount: 0,
              shareCount: 0,
              mediaUrl: '',
            });
          }
        });
        return results;
      });
      console.log(`[LinkedIn] DOM scrape got ${posts.length} posts`);
    }

    // Deduplicate
    const seen = new Set<string>();
    posts = posts.filter((p) => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });

    console.log(`[LinkedIn] Final: ${posts.length} unique posts`);

    if (posts.length > 0) {
      writeCache(posts);
    }

    return { posts, syncedAt: new Date().toISOString(), source: 'scrape' };
  } finally {
    await browser.close();
  }
}
