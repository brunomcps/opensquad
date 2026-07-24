/**
 * One-time migration: JSON files → Supabase
 * Usage: npx tsx --env-file=../.env server/scripts/migrate-to-supabase.ts
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  saveInstagramPosts, saveFacebookPosts, saveThreadsPosts,
  saveTwitterPosts, saveLinkedInPosts, saveTikTokVideos,
  saveFichas, saveCrossPatterns,
  saveCompetitorRegistry, saveCompetitorPlatformData, addCompetitorHistoryEntry,
  saveYoutubeCompetitorStat,
  getContentGroups, saveContentGroups,
  saveBRolls, saveProduction, savePublication, saveApiToken,
} from '../db/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DATA = path.resolve(__dirname, '../../data');

function readJson(file: string): any {
  const p = path.join(DATA, file);
  if (!fs.existsSync(p)) { console.log(`  SKIP ${file} (not found)`); return null; }
  return JSON.parse(fs.readFileSync(p, 'utf-8'));
}

async function migratePosts() {
  console.log('\n--- Social Posts ---');

  const ig = readJson('instagram-posts.json');
  if (ig?.posts) { await saveInstagramPosts(ig.posts, ig.syncedAt); console.log(`  Instagram: ${ig.posts.length} posts`); }

  const fb = readJson('facebook-posts.json');
  if (fb?.posts) { await saveFacebookPosts(fb.posts, fb.syncedAt); console.log(`  Facebook: ${fb.posts.length} posts`); }

  const th = readJson('threads-posts.json');
  if (th?.posts) { await saveThreadsPosts(th.posts, th.syncedAt); console.log(`  Threads: ${th.posts.length} posts`); }

  const tw = readJson('twitter-posts.json');
  if (tw?.posts) { await saveTwitterPosts(tw.posts, tw.syncedAt); console.log(`  Twitter: ${tw.posts.length} posts`); }

  const li = readJson('linkedin-posts.json');
  if (li?.posts) { await saveLinkedInPosts(li.posts, li.syncedAt); console.log(`  LinkedIn: ${li.posts.length} posts`); }

  const tt = readJson('tiktok-videos.json');
  if (tt?.videos) { await saveTikTokVideos(tt.videos, tt.syncedAt); console.log(`  TikTok: ${tt.videos.length} videos`); }
}

async function migrateFichas() {
  console.log('\n--- Fichas ---');
  const data = readJson('fichas.json');
  if (data && Array.isArray(data)) { await saveFichas(data); console.log(`  ${data.length} fichas`); }

  const patterns = readJson('cross-patterns.json');
  if (patterns) { await saveCrossPatterns(patterns); console.log('  Cross patterns saved'); }
}

async function migrateCompetitors() {
  console.log('\n--- Competitors ---');

  // Legacy YouTube competitors
  const legacy = readJson('competitors.json');
  if (legacy && Array.isArray(legacy)) {
    for (const c of legacy) await saveYoutubeCompetitorStat(c);
    console.log(`  YouTube legacy: ${legacy.length} competitors`);
  }

  // Viral Radar registry
  const registryPath = path.join(DATA, 'competitors', '_registry.json');
  if (fs.existsSync(registryPath)) {
    const registry = JSON.parse(fs.readFileSync(registryPath, 'utf-8'));
    if (registry.competitors) {
      await saveCompetitorRegistry(registry.competitors);
      console.log(`  Registry: ${registry.competitors.length} competitors`);

      // Platform data for each competitor
      for (const comp of registry.competitors) {
        const compDir = path.join(DATA, 'competitors', comp.id);
        if (!fs.existsSync(compDir)) continue;

        for (const platform of Object.keys(comp.platforms || {})) {
          const dataFile = path.join(compDir, `${platform}.json`);
          if (fs.existsSync(dataFile)) {
            const platData = JSON.parse(fs.readFileSync(dataFile, 'utf-8'));
            await saveCompetitorPlatformData(comp.id, platform, platData);
            console.log(`  ${comp.name}/${platform}: ${platData.itemCount || '?'} items`);
          }

          // History
          const histFile = path.join(compDir, `${platform}_history.json`);
          if (fs.existsSync(histFile)) {
            const history = JSON.parse(fs.readFileSync(histFile, 'utf-8'));
            if (Array.isArray(history)) {
              for (const entry of history) await addCompetitorHistoryEntry(comp.id, platform, entry);
              console.log(`  ${comp.name}/${platform} history: ${history.length} entries`);
            }
          }
        }
      }
    }
  }
}

async function migrateMisc() {
  console.log('\n--- Misc ---');

  const groups = readJson('content-groups.json');
  if (groups && Array.isArray(groups)) { await saveContentGroups(groups); console.log(`  Content groups: ${groups.length}`); }

  const brolls = readJson('brolls.json');
  if (brolls && Array.isArray(brolls)) { await saveBRolls(brolls); console.log(`  B-Rolls: ${brolls.length}`); }

  const prods = readJson('productions.json');
  if (prods && Array.isArray(prods)) {
    for (const p of prods) await saveProduction(p);
    console.log(`  Productions: ${prods.length}`);
  }

  const pubs = readJson('publications.json');
  if (pubs && Array.isArray(pubs)) {
    for (const p of pubs) await savePublication(p);
    console.log(`  Publications: ${pubs.length}`);
  }

  // Tokens
  for (const platform of ['instagram', 'facebook', 'threads']) {
    const token = readJson(`${platform}-token.json`);
    if (token?.token) {
      await saveApiToken(platform, token.token, token.refreshedAt, token.expiresIn);
      console.log(`  ${platform} token saved`);
    }
  }
}

async function main() {
  console.log('=== Migrating JSON files to Supabase ===');
  console.log(`Data dir: ${DATA}`);

  await migratePosts();
  await migrateFichas();
  await migrateCompetitors();
  await migrateMisc();

  console.log('\n=== Migration complete! ===');
}

main().catch(console.error);
