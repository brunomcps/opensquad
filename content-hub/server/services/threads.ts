import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getThreadsPosts, saveThreadsPosts, getApiToken, saveApiToken } from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const CACHE_PATH = path.resolve(__dirname, '../../data/threads-posts.json');
const TOKEN_PATH = path.resolve(__dirname, '../../data/threads-token.json');
const ENV_PATH = path.resolve(__dirname, '../../../.env');

let currentToken = process.env.THREADS_ACCESS_TOKEN || '';
const API_BASE = 'https://graph.threads.net/v1.0';

// --- Token auto-refresh ---

interface TokenData {
  token: string;
  refreshedAt: string;
  expiresIn: number;
}

async function readTokenData(): Promise<TokenData | null> {
  try { const db = await getApiToken('threads'); if (db) return { token: db.token, refreshedAt: db.refreshedAt, expiresIn: db.expiresIn }; } catch {}
  try { return JSON.parse(fs.readFileSync(TOKEN_PATH, 'utf-8')); } catch { return null; }
}

async function saveTokenDataToDB(data: TokenData) {
  try { await saveApiToken('threads', data.token, data.refreshedAt, data.expiresIn); } catch {}
  try { fs.writeFileSync(TOKEN_PATH, JSON.stringify(data, null, 2), 'utf-8'); } catch {}
}

function updateEnvToken(newToken: string) {
  try {
    let env = fs.readFileSync(ENV_PATH, 'utf-8');
    env = env.replace(/THREADS_ACCESS_TOKEN=.+/, `THREADS_ACCESS_TOKEN=${newToken}`);
    fs.writeFileSync(ENV_PATH, env, 'utf-8');
  } catch (e) {
    console.error('[Threads] Failed to update .env:', e);
  }
}

export async function refreshThreadsTokenIfNeeded() {
  if (!currentToken) return;

  const tokenData = await readTokenData();
  const now = Date.now();

  if (tokenData) {
    const daysSinceRefresh = (now - new Date(tokenData.refreshedAt).getTime()) / (1000 * 60 * 60 * 24);
    if (daysSinceRefresh < 30) {
      console.log(`[Threads] Token OK — refreshed ${Math.round(daysSinceRefresh)} days ago`);
      currentToken = tokenData.token;
      return;
    }
  }

  console.log('[Threads] Refreshing token...');
  try {
    const res = await fetch(`${API_BASE}/refresh_access_token?grant_type=th_refresh_token&access_token=${currentToken}`);
    const data = await res.json();

    if (data.access_token) {
      currentToken = data.access_token;
      const tokenInfo: TokenData = {
        token: data.access_token,
        refreshedAt: new Date().toISOString(),
        expiresIn: data.expires_in || 5184000,
      };
      await saveTokenDataToDB(tokenInfo);
      updateEnvToken(data.access_token);
      console.log(`[Threads] Token refreshed! Expires in ${Math.round((data.expires_in || 5184000) / 86400)} days`);
    } else {
      console.error('[Threads] Token refresh failed:', data.error?.message || 'Unknown error');
    }
  } catch (e: any) {
    console.error('[Threads] Token refresh error:', e.message);
  }
}

function getToken(): string {
  return currentToken;
}

export interface ThreadsPost {
  id: string;
  text: string;
  mediaType: string; // TEXT_POST, IMAGE, VIDEO, CAROUSEL_ALBUM
  mediaUrl?: string;
  permalink: string;
  timestamp: string;
  likeCount: number;
  replyCount: number;
}

interface CacheData {
  posts: ThreadsPost[];
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

function writeCache(posts: ThreadsPost[]) {
  const data: CacheData = { posts, syncedAt: new Date().toISOString() };
  fs.writeFileSync(CACHE_PATH, JSON.stringify(data, null, 2), 'utf-8');
}

export async function getCachedThreadsPosts(): Promise<CacheData> {
  try { const db = await getThreadsPosts(); if (db.posts.length > 0) return db; } catch {}
  const cache = readCache();
  if (cache) return cache;
  return { posts: [], syncedAt: '' };
}

export async function fetchThreadsPosts(): Promise<CacheData> {
  const token = getToken();
  if (!token) throw new Error('THREADS_ACCESS_TOKEN not set');

  const allPosts: ThreadsPost[] = [];
  let url = `${API_BASE}/me/threads?fields=id,text,media_type,media_url,permalink,timestamp,likes,replies&limit=50&access_token=${token}`;

  while (url) {
    const res = await fetch(url);
    const data = await res.json();

    if (data.error) throw new Error(data.error.message);

    for (const p of data.data || []) {
      allPosts.push({
        id: p.id,
        text: p.text || '',
        mediaType: p.media_type || 'TEXT_POST',
        mediaUrl: p.media_url || '',
        permalink: p.permalink || '',
        timestamp: p.timestamp || '',
        likeCount: p.likes?.summary?.total_count ?? p.likes ?? 0,
        replyCount: p.replies?.summary?.total_count ?? p.replies ?? 0,
      });
    }

    url = data.paging?.next || '';
  }

  console.log(`[Threads] Fetched ${allPosts.length} posts via API`);
  const syncedAt = new Date().toISOString();
  writeCache(allPosts);
  try { await saveThreadsPosts(allPosts, syncedAt); } catch (e: any) { console.error('[Threads] DB write error:', e.message); }
  return { posts: allPosts, syncedAt };
}
