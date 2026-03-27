import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, '../../data/instagram-posts.json');
const TOKEN_PATH = path.resolve(__dirname, '../../data/instagram-token.json');
const ENV_PATH = path.resolve(__dirname, '../../../.env');

let currentToken = process.env.INSTAGRAM_ACCESS_TOKEN || '';
const USER_ID = process.env.INSTAGRAM_USER_ID || '';
const API_BASE = 'https://graph.instagram.com/v21.0';

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
    env = env.replace(/INSTAGRAM_ACCESS_TOKEN=.+/, `INSTAGRAM_ACCESS_TOKEN=${newToken}`);
    fs.writeFileSync(ENV_PATH, env, 'utf-8');
  } catch (e) {
    console.error('[Instagram] Failed to update .env:', e);
  }
}

export async function refreshTokenIfNeeded() {
  if (!currentToken) return;

  const tokenData = readTokenData();
  const now = Date.now();

  // If we have token data, check if it's been more than 30 days since last refresh
  if (tokenData) {
    const daysSinceRefresh = (now - new Date(tokenData.refreshedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRefresh < 30) {
      console.log(`[Instagram] Token OK — refreshed ${Math.round(daysSinceRefresh)} days ago`);
      currentToken = tokenData.token;
      return;
    }
  }

  // Refresh the token
  console.log('[Instagram] Refreshing token...');
  try {
    const res = await fetch(`https://graph.instagram.com/refresh_access_token?grant_type=ig_refresh_token&access_token=${currentToken}`);
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
      console.log(`[Instagram] Token refreshed! Expires in ${Math.round(data.expires_in / 86400)} days`);
    } else {
      console.error('[Instagram] Token refresh failed:', data.error?.message || 'Unknown error');
    }
  } catch (e: any) {
    console.error('[Instagram] Token refresh error:', e.message);
  }
}

function getToken(): string {
  return currentToken;
}

export interface InstagramPost {
  id: string;
  caption: string;
  mediaType: string; // IMAGE, VIDEO, CAROUSEL_ALBUM, REEL
  thumbnailUrl?: string;
  mediaUrl?: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  commentsCount: number;
}

interface CacheData {
  posts: InstagramPost[];
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

function writeCache(posts: InstagramPost[]) {
  const data: CacheData = { posts, syncedAt: new Date().toISOString() };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export function getCachedInstagramPosts(): CacheData {
  const cache = readCache();
  if (cache) return cache;
  return { posts: [], syncedAt: '' };
}

export async function fetchInstagramPosts(): Promise<CacheData> {
  const token = getToken();
  if (!token) throw new Error('INSTAGRAM_ACCESS_TOKEN not set');

  const allPosts: InstagramPost[] = [];
  let url = `${API_BASE}/me/media?fields=id,caption,media_type,media_url,thumbnail_url,permalink,timestamp,like_count,comments_count&limit=50&access_token=${token}`;

  // Paginate through all posts
  while (url) {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    for (const p of data.data || []) {
      allPosts.push({
        id: p.id,
        caption: p.caption || '',
        mediaType: p.media_type || 'IMAGE',
        thumbnailUrl: p.thumbnail_url || p.media_url || '',
        mediaUrl: p.media_url || '',
        permalink: p.permalink || '',
        timestamp: p.timestamp || '',
        likeCount: p.like_count || 0,
        commentsCount: p.comments_count || 0,
      });
    }

    url = data.paging?.next || '';
  }

  console.log(`[Instagram] Fetched ${allPosts.length} posts via API`);
  writeCache(allPosts);
  return { posts: allPosts, syncedAt: new Date().toISOString() };
}
