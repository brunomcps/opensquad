import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, '../../data/facebook-posts.json');
const TOKEN_PATH = path.resolve(__dirname, '../../data/facebook-token.json');
const ENV_PATH = path.resolve(__dirname, '../../../.env');

let currentToken = process.env.FACEBOOK_ACCESS_TOKEN || '';
const PAGE_ID = process.env.FACEBOOK_PAGE_ID || '';
const API_BASE = 'https://graph.facebook.com/v21.0';

// --- Token auto-refresh ---

interface TokenData {
  token: string;
  refreshedAt: string;
  expiresIn: number;
}

function readTokenData(): TokenData | null {
  try {
    return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8'));
  } catch { return null; }
}

function saveTokenData(data: TokenData) {
  fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

function updateEnvToken(newToken: string) {
  try {
    let env = fs.readFileSync(ENV_PATH, 'utf-8');
    env = env.replace(/FACEBOOK_ACCESS_TOKEN=.+/, `FACEBOOK_ACCESS_TOKEN=${newToken}`);
    fs.writeFileSync(ENV_PATH, env, 'utf-8');
  } catch (e) {
    console.error('[Facebook] Failed to update .env:', e);
  }
}

export async function refreshFacebookTokenIfNeeded() {
  if (!currentToken) return;

  const tokenData = readTokenData();
  const now = Date.now();

  if (tokenData) {
    const daysSinceRefresh = (now - new Date(tokenData.refreshedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRefresh < 30) {
      console.log(`[Facebook] Token OK — refreshed ${Math.round(daysSinceRefresh)} days ago`);
      currentToken = tokenData.token;
      return;
    }
  }

  console.log('[Facebook] Refreshing token...');
  try {
    const res = await fetch(`${API_BASE}/oauth/access_token?grant_type=fb_exchange_token&client_id=${process.env.FACEBOOK_APP_ID}&client_secret=${process.env.FACEBOOK_APP_SECRET}&fb_exchange_token=${currentToken}`);
    const data = await res.json();

    if (data.access_token) {
      currentToken = data.access_token;
      const tokenInfo: TokenData = {
        token: data.access_token,
        refreshedAt: new Date().toISOString(),
        expiresIn: data.expires_in || 5184000,
      };
      saveTokenData(tokenInfo);
      updateEnvToken(data.access_token);
      console.log(`[Facebook] Token refreshed! Expires in ${Math.round((data.expires_in || 5184000) / 86400)} days`);
    } else {
      console.error('[Facebook] Token refresh failed:', data.error?.message || 'Unknown error');
    }
  } catch (e: any) {
    console.error('[Facebook] Token refresh error:', e.message);
  }
}

function getToken(): string {
  return currentToken;
}

export interface FacebookPost {
  id: string;
  message: string;
  fullPicture?: string;
  permalink: string;
  createdTime: string;
  type: string; // link, status, photo, video
  likeCount: number;
  commentCount: number;
  shareCount: number;
}

interface CacheData {
  posts: FacebookPost[];
  syncedAt: string;
}

function readCache(): CacheData | null {
  try {
    const raw = fs.readFileSync(CACHE_PATH, 'utf-8');
    const data = JSON.parse(raw);
    if (data.posts) return data;
  } catch {}
  return null;
}

function writeCache(posts: FacebookPost[]) {
  const data: CacheData = { posts, syncedAt: new Date().toISOString() };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getCachedFacebookPosts(): CacheData {
  const cache = readCache();
  if (cache) return cache;
  return { posts: [], syncedAt: '' };
}

export async function fetchFacebookPosts(): Promise<CacheData> {
  const token = getToken();
  if (!token) throw new Error('FACEBOOK_ACCESS_TOKEN not set');

  const target = PAGE_ID || 'me';
  const allPosts: FacebookPost[] = [];
  // Use /published_posts instead of /posts — required for New Pages Experience
  // Note: likes.summary(true) and comments.summary(true) require advanced permissions in dev mode
  let url = `${API_BASE}/${target}/published_posts?fields=id,message,full_picture,permalink_url,created_time,shares&limit=100&access_token=${token}`;

  while (url) {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    for (const p of data.data || []) {
      allPosts.push({
        id: p.id,
        message: p.message || '',
        fullPicture: p.full_picture || '',
        permalink: p.permalink_url || '',
        createdTime: p.created_time || '',
        type: 'status', // type field deprecated in v3.3+
        likeCount: p.likes?.summary?.total_count || 0,
        commentCount: p.comments?.summary?.total_count || 0,
        shareCount: p.shares?.count || 0,
      });
    }

    url = data.paging?.next || '';
  }

  console.log(`[Facebook] Fetched ${allPosts.length} posts via API`);
  writeCache(allPosts);
  return { posts: allPosts, syncedAt: new Date().toISOString() };
}
